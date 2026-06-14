import { ethers } from 'ethers';
import { config } from '../config';
import { pool } from '../db/client';
import { redis } from '../redis/client';
import { publishEvent } from '../nats';

const MARKETPLACE_ABI = [
  "event NFTListed(address indexed nftMint, address indexed marketplace, address indexed seller, uint256 price, uint256 timestamp)",
  "event NFTPurchased(address indexed nftMint, address indexed marketplace, address indexed seller, address buyer, uint256 price, uint256 timestamp)",
  "event NFTDelisted(address indexed nftMint, address indexed marketplace, address indexed seller, uint256 price, uint256 timestamp)",
  "event FeeUpdated(address indexed marketplace, address indexed admin, uint16 oldFee, uint16 newFee, uint256 timestamp)",
  "function name() view returns (string)",
  "function feeBps() view returns (uint16)",
  "function authority() view returns (address)",
  "function treasury() view returns (address)",
  "function listings(address, uint256) view returns (address maker, address nftContract, uint256 tokenId, uint256 price, bool active)"
];

const ERC721_ABI = [
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

const provider = new ethers.JsonRpcProvider(config.evmRpcUrl);
const marketplaceContract = new ethers.Contract(config.evmMarketplaceAddress, MARKETPLACE_ABI, provider);

// Fetch ERC721 metadata for a token
async function fetchERC721Metadata(nftContractAddress: string, tokenId: string): Promise<{
  name: string;
  symbol: string;
  uri: string;
  image_url?: string;
  animation_url?: string;
  description?: string;
  attributes?: any;
}> {
  const nftContract = new ethers.Contract(nftContractAddress, ERC721_ABI, provider);
  
  try {
    const name = await nftContract.name().catch(() => 'Nexus NFT');
    const symbol = await nftContract.symbol().catch(() => 'NEXUS');
    const uri = await nftContract.tokenURI(tokenId).catch(() => '');

    let image_url = '';
    let description = '';
    let attributes: any = null;
    let animation_url = '';

    if (uri && uri.startsWith('http')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(uri, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          image_url = json.image || '';
          description = json.description || '';
          attributes = json.attributes || null;
          animation_url = json.animation_url || '';
          
          // Metaplex format fallback
          let mediaType: 'audio' | 'video' | null = null;
          if (!animation_url && json.properties?.files) {
            const mediaFile = json.properties.files.find(
              (f: any) => f.type?.startsWith('video/') || f.type?.startsWith('audio/')
            );
            if (mediaFile) {
              animation_url = mediaFile.uri;
              mediaType = mediaFile.type?.startsWith('video/') ? 'video' : 'audio';
            }
          } else if (animation_url) {
            const category = json.properties?.category;
            if (category === 'video' || category === 'audio') {
              mediaType = category;
            } else {
              const cleanUrl = animation_url.split('?')[0].split('#')[0].toLowerCase();
              if (cleanUrl.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/)) {
                mediaType = 'audio';
              } else if (cleanUrl.match(/\.(mp4|webm|mov|ogv|m4v)$/)) {
                mediaType = 'video';
              }
            }
          }

          if (mediaType) {
            if (!attributes) attributes = [];
            if (Array.isArray(attributes)) {
              const hasFormat = attributes.some((a: any) => a.trait_type === 'Format');
              if (!hasFormat) {
                attributes.push({
                  trait_type: 'Format',
                  value: mediaType === 'audio' ? 'Audio' : 'Video'
                });
              }
            }
          }
        }
      } catch (fetchErr: any) {
        console.warn(`Failed to fetch EVM metadata from ${uri}:`, fetchErr.message);
      }
    }

    return { name, symbol, uri, image_url, animation_url, description, attributes };
  } catch (error) {
    console.error(`Error fetching ERC721 metadata for ${nftContractAddress} #${tokenId}:`, error);
  }

  // Fallback
  return {
    name: `NFT #${tokenId}`,
    symbol: 'NFT',
    uri: '',
    image_url: '',
    animation_url: '',
    description: 'EVM NFT Marketplace item',
    attributes: null
  };
}

async function invalidateCaches(marketplaceAddress: string, mintAddress?: string) {
  const keys = await redis.keys(`*${marketplaceAddress}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  if (mintAddress) {
    await redis.del(`listing:mint:${mintAddress}`);
  }
}

// Handle single EVM event log
async function handleEVMEvent(eventName: string, data: any, txHash: string, blockNumber: number, timestamp: number) {
  console.log(`Processing EVM event: ${eventName} in transaction ${txHash}`);
  const client = await pool.connect();
  let publishFn: (() => Promise<void>) | null = null;
  try {
    await client.query('BEGIN');

    // Check if event already exists to maintain idempotency
    const eventExists = await client.query(
      'SELECT 1 FROM marketplace_events WHERE LOWER(tx_signature) = LOWER($1) AND event_type = $2',
      [txHash, eventName]
    );
    if (eventExists.rowCount > 0) {
      console.log(`Event ${eventName} for transaction ${txHash} already exists in DB. Skipping duplicate processing.`);
      await client.query('COMMIT');
      return;
    }

    const marketAddressLower = config.evmMarketplaceAddress.toLowerCase();
    const nftMintAddress = (data.nftMint || '').toLowerCase();
    const tokenId = data.tokenId || '1';
    const compositeMint = nftMintAddress ? `${nftMintAddress}-${tokenId}` : '';
    const sellerLower = (data.seller || '').toLowerCase();
    const buyerLower = (data.buyer || '').toLowerCase();

    // Standardize event data payload to match schema queries
    let dbEventData: any = {};
    if (eventName === 'NFTListed') {
      dbEventData = {
        nft_mint: compositeMint,
        marketplace: marketAddressLower,
        seller: sellerLower,
        price: data.price
      };
    } else if (eventName === 'NFTPurchased') {
      dbEventData = {
        nft_mint: compositeMint,
        marketplace: marketAddressLower,
        seller: sellerLower,
        buyer: buyerLower,
        price: data.price
      };
    } else if (eventName === 'NFTDelisted') {
      dbEventData = {
        nft_mint: compositeMint,
        marketplace: marketAddressLower,
        seller: sellerLower,
        price: data.price
      };
    } else if (eventName === 'FeeUpdated') {
      dbEventData = {
        marketplace: marketAddressLower,
        admin: (data.admin || '').toLowerCase(),
        old_fee: data.oldFee,
        new_fee: data.newFee
      };
    }

    // Save event to history
    await client.query(
      `INSERT INTO marketplace_events (event_type, tx_signature, block_time, slot, data) 
       VALUES ($1, $2, $3, $4, $5)`,
      [eventName, txHash, timestamp, blockNumber, dbEventData]
    );

    if (eventName === 'NFTListed') {
      const price = data.price;

      // Ensure NFT Metadata exists in database
      const metaExists = await client.query('SELECT 1 FROM nft_metadata WHERE mint = $1', [compositeMint]);
      if (metaExists.rowCount === 0) {
        const meta = await fetchERC721Metadata(nftMintAddress, tokenId);
        await client.query(
          `INSERT INTO nft_metadata (mint, name, symbol, uri, image_url, description, attributes, chain, animation_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'evm', $8)`,
          [compositeMint, meta.name, meta.symbol, meta.uri, meta.image_url, meta.description, JSON.stringify(meta.attributes), meta.animation_url || null]
        );
      }

      // Upsert listing
      const compositeListing = `${marketAddressLower}-${compositeMint}`;
      await client.query(
        `INSERT INTO listings (address, marketplace_address, maker, nft_mint, price, metadata_address, status, chain)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', 'evm')
         ON CONFLICT (address) DO UPDATE 
         SET maker = $3, price = $5, status = 'active', updated_at = CURRENT_TIMESTAMP`,
        [compositeListing, marketAddressLower, sellerLower, compositeMint, price, nftMintAddress]
      );
      await invalidateCaches(marketAddressLower, compositeMint);

      publishFn = async () => {
        const result = await pool.query(`
          SELECT l.*, m.name as nft_name, m.symbol as nft_symbol, m.image_url, m.animation_url, m.description, m.attributes
          FROM listings l
          JOIN nft_metadata m ON l.nft_mint = m.mint
          WHERE l.address = $1
        `, [compositeListing]);
        if (result.rows.length > 0) {
          const row = result.rows[0];
          await publishEvent('marketplace.event', {
            event: 'listed',
            chain: 'evm',
            data: {
              address: row.address,
              marketplaceAddress: row.marketplace_address,
              maker: row.maker,
              nftMint: row.nft_mint,
              price: row.price.toString(),
              metadataAddress: row.metadata_address,
              status: row.status,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              chain: row.chain || 'evm',
              nft: {
                name: row.nft_name,
                symbol: row.nft_symbol,
                imageUrl: row.image_url,
                image: row.image_url,
                animationUrl: row.animation_url,
                animation_url: row.animation_url,
                description: row.description,
                attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes,
              }
            }
          });
        }
      };
    } 
    
    else if (eventName === 'NFTPurchased') {
      const compositeListing = `${marketAddressLower}-${compositeMint}`;

      await client.query(
        `UPDATE listings 
         SET status = 'sold', updated_at = CURRENT_TIMESTAMP 
         WHERE address = $1`,
        [compositeListing]
      );
      await invalidateCaches(marketAddressLower, compositeMint);

      publishFn = async () => {
        await publishEvent('marketplace.event', {
          event: 'purchased',
          chain: 'evm',
          data: {
            address: compositeListing,
            nftMint: compositeMint,
            buyer: buyerLower,
            price: data.price.toString()
          }
        });
      };
    } 
    
    else if (eventName === 'NFTDelisted') {
      const compositeListing = `${marketAddressLower}-${compositeMint}`;

      await client.query(
        `UPDATE listings 
         SET status = 'delisted', updated_at = CURRENT_TIMESTAMP 
         WHERE address = $1`,
        [compositeListing]
      );
      await invalidateCaches(marketAddressLower, compositeMint);

      publishFn = async () => {
        await publishEvent('marketplace.event', {
          event: 'delisted',
          chain: 'evm',
          data: {
            address: compositeListing,
            nftMint: compositeMint
          }
        });
      };
    } 
    
    else if (eventName === 'FeeUpdated') {
      const newFee = data.newFee;
      await client.query(
        `UPDATE marketplaces 
         SET fee_bps = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE address = $1`,
        [marketAddressLower, newFee]
      );
      await invalidateCaches(marketAddressLower);
    }

    await client.query('COMMIT');
    if (publishFn) {
      await publishFn().catch(e => console.error('Error in post-commit publishing:', e));
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error handling EVM event:', error);
  } finally {
    client.release();
  }
}


// Backfiller for EVM on startup
export async function runEVMBackfill() {
  console.log('Starting EVM on-chain backfill check...');
  const client = await pool.connect();
  
  try {
    const marketAddressLower = config.evmMarketplaceAddress.toLowerCase();
    
    // 1. Fetch fee and authority from marketplace contract
    const name = await marketplaceContract.name().catch(() => 'Nexus EVM Marketplace');
    const feeBps = await marketplaceContract.feeBps().catch(() => 250);
    const authority = await marketplaceContract.authority().catch(() => ethers.ZeroAddress);
    const treasury = await marketplaceContract.treasury().catch(() => ethers.ZeroAddress);

    await client.query(
      `INSERT INTO marketplaces (address, name, fee_bps, authority, treasury, chain)
       VALUES ($1, $2, $3, $4, $5, 'evm')
       ON CONFLICT (address) DO UPDATE 
       SET name = $2, fee_bps = $3, authority = $4, treasury = $5`,
      [marketAddressLower, name, Number(feeBps), authority.toLowerCase(), treasury.toLowerCase()]
    );
    console.log('✅ Backfilled EVM Marketplace details.');
  } catch (error) {
    console.error('Failed to backfill EVM marketplace:', error);
  } finally {
    client.release();
  }
}

// Live EVM Event Listener using Block Polling
export async function startLiveEVMIndexer() {
  console.log('Starting live EVM event indexer (polling mode)...');

  const client = await pool.connect();
  let startBlock = 11049240; // Default to Sepolia deployment block
  try {
    const res = await client.query("SELECT MAX(slot) as max_slot FROM marketplace_events WHERE event_type IN ('NFTListed', 'NFTPurchased', 'NFTDelisted', 'FeeUpdated') AND data->>'marketplace' LIKE '0x%'");
    if (res.rows[0] && res.rows[0].max_slot) {
      // Look back 50 blocks from the maximum processed block slot, with a floor of the deployment block
      startBlock = Math.max(11049240, parseInt(res.rows[0].max_slot, 10) - 50);
    }
    console.log(`EVM indexer starting block (with lookback buffer): ${startBlock}`);
  } catch (err) {
    console.error('Error fetching max block from DB, using default:', err);
  } finally {
    client.release();
  }

  let currentBlock = startBlock;
  const BATCH_SIZE = 5;
  let isPolling = false;

  async function poll() {
    if (isPolling) return;
    isPolling = true;
    try {
      while (true) {
        const latestBlock = await provider.getBlockNumber();
        if (currentBlock > latestBlock) {
          break;
        }

        const toBlock = Math.min(currentBlock + BATCH_SIZE - 1, latestBlock);
        console.log(`[EVM Poller] Scanning blocks ${currentBlock} to ${toBlock}...`);

        const logs = await provider.getLogs({
          address: config.evmMarketplaceAddress,
          fromBlock: currentBlock,
          toBlock: toBlock
        });

        for (const log of logs) {
          try {
            const parsed = marketplaceContract.interface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });
            if (!parsed) continue;

            const eventName = parsed.name;
            const txHash = log.transactionHash;
            const blockNumber = log.blockNumber;
            const block = await provider.getBlock(blockNumber);
            const timestamp = block ? block.timestamp : Math.floor(Date.now() / 1000);

            const args = parsed.args;
            let tokenId = '1';

            if (eventName !== 'FeeUpdated') {
              try {
                const tx = await provider.getTransaction(txHash);
                const decoded = marketplaceContract.interface.parseTransaction({ data: tx?.data || '0x' });
                if (decoded && decoded.args && decoded.args.tokenId) {
                  tokenId = decoded.args.tokenId.toString();
                }
              } catch (txErr) {
                console.warn(`Could not parse transaction input for tx ${txHash}:`, txErr);
              }
            }

            const dataPayload: any = {};
            if (eventName === 'NFTListed') {
              dataPayload.nftMint = args.nftMint;
              dataPayload.marketplace = args.marketplace;
              dataPayload.seller = args.seller;
              dataPayload.price = args.price.toString();
              dataPayload.tokenId = tokenId;
            } else if (eventName === 'NFTPurchased') {
              dataPayload.nftMint = args.nftMint;
              dataPayload.marketplace = args.marketplace;
              dataPayload.seller = args.seller;
              dataPayload.buyer = args.buyer;
              dataPayload.price = args.price.toString();
              dataPayload.tokenId = tokenId;
            } else if (eventName === 'NFTDelisted') {
              dataPayload.nftMint = args.nftMint;
              dataPayload.marketplace = args.marketplace;
              dataPayload.seller = args.seller;
              dataPayload.price = args.price.toString();
              dataPayload.tokenId = tokenId;
            } else if (eventName === 'FeeUpdated') {
              dataPayload.marketplace = args.marketplace;
              dataPayload.admin = args.admin;
              dataPayload.oldFee = Number(args.oldFee);
              dataPayload.newFee = Number(args.newFee);
            }

            await handleEVMEvent(eventName, dataPayload, txHash, blockNumber, timestamp);
          } catch (logErr) {
            console.error('Error processing log entry:', logErr);
          }
        }

        currentBlock = toBlock + 1;
        
        // If we have caught up to the latest block, break out and wait for the next interval
        if (currentBlock > latestBlock) {
          break;
        }
        
        // Small delay to prevent spamming RPC node when catching up on many blocks
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (pollErr) {
      console.error('Error in live EVM poll interval:', pollErr);
    } finally {
      isPolling = false;
    }
  }

  // Run immediately then poll every 8 seconds
  poll();
  setInterval(poll, 8000);
  console.log('✅ Live EVM event indexer started successfully.');
}
