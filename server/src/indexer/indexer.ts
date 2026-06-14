import { Connection, PublicKey } from '@solana/web3.js';
import { BorshCoder, EventParser, Idl } from '@coral-xyz/anchor';
import { config } from '../config';
import { pool } from '../db/client';
import { redis } from '../redis/client';
import idlRaw from '../idl/anchor_nft_marketplace.json';
import { publishEvent } from '../nats';

const idl = idlRaw as Idl;
const PROGRAM_ID = new PublicKey(config.programId);
const METAPLEX_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

const connection = new Connection(config.solanaRpcUrl, 'confirmed');
const coder = new BorshCoder(idl);
const eventParser = new EventParser(PROGRAM_ID, coder);

// Helper to derive Metaplex metadata PDA
function getMetadataPDA(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METAPLEX_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METAPLEX_PROGRAM_ID
  );
  return pda;
}

// Fetch Metaplex metadata for a mint
async function fetchNftMetadata(mintAddress: string): Promise<{
  name: string;
  symbol: string;
  uri: string;
  image_url?: string;
  description?: string;
  attributes?: any;
}> {
  const mint = new PublicKey(mintAddress);
  const metadataPDA = getMetadataPDA(mint);

  try {
    const accountInfo = await connection.getAccountInfo(metadataPDA);
    if (accountInfo && accountInfo.data) {
      const data = accountInfo.data;
      // Metaplex offsets:
      // name: starts at 65 (4-byte length prefix) -> data starts at 69, length 32
      // symbol: starts at 101 (4-byte length prefix) -> data starts at 105, length 10
      // uri: starts at 115 (4-byte length prefix) -> data starts at 119, length 200
      const name = data.slice(69, 101).toString('utf8').replace(/\0/g, '').trim();
      const symbol = data.slice(105, 115).toString('utf8').replace(/\0/g, '').trim();
      const uri = data.slice(119, 319).toString('utf8').replace(/\0/g, '').trim();

      let image_url = '';
      let description = '';
      let attributes: any = null;
      let animation_url = '';

      if (uri && uri.startsWith('http')) {
        try {
          // Fetch with a short 2-second timeout to prevent stalling
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
          console.warn(`Failed to fetch external metadata from ${uri}:`, fetchErr.message);
        }
      }

      return { name, symbol, uri, image_url, description, attributes, animation_url };
    }
  } catch (error) {
    console.error(`Error fetching Metaplex metadata for ${mintAddress}:`, error);
  }

  // Fallback if metadata not found/fails
  return {
    name: `NFT ${mintAddress.slice(0, 6)}`,
    symbol: 'NFT',
    uri: '',
    image_url: '',
    description: 'Solana NFT Marketplace item',
    attributes: null,
    animation_url: ''
  };
}

// Invalidate redis cache for listings and stats
async function invalidateCaches(marketplaceAddress: string, mintAddress?: string) {
  const keys = await redis.keys(`*${marketplaceAddress}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  if (mintAddress) {
    await redis.del(`listing:mint:${mintAddress}`);
  }
}

// Process single on-chain event
async function handleEvent(event: any, signature: string, slot: number, blockTime: number) {
  console.log(`Processing event: ${event.name} in transaction ${signature}`);
  
  const client = await pool.connect();
  let publishFn: (() => Promise<void>) | null = null;
  try {
    await client.query('BEGIN');

    // Save event to history
    await client.query(
      `INSERT INTO marketplace_events (event_type, tx_signature, block_time, slot, data) 
       VALUES ($1, $2, $3, $4, $5)`,
      [event.name, signature, blockTime, slot, event.data]
    );

    if (event.name === 'InitializeMarketplace') {
      const { marketplace, name, fee, admin, treasury } = event.data;
      await client.query(
        `INSERT INTO marketplaces (address, name, fee_bps, authority, treasury)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (address) DO UPDATE 
         SET name = $2, fee_bps = $3, authority = $4, treasury = $5`,
        [marketplace.toBase58(), name, fee, admin.toBase58(), treasury.toBase58()]
      );
      await invalidateCaches(marketplace.toBase58());
    } 
    
    else if (event.name === 'NFTListed') {
      const { nft_mint: nftMint, marketplace, seller, price } = event.data;
      const mintStr = nftMint.toBase58();
      const marketStr = marketplace.toBase58();
      const sellerStr = seller.toBase58();

      // Ensure NFT Metadata exists in database
      const metaExists = await client.query('SELECT 1 FROM nft_metadata WHERE mint = $1', [mintStr]);
      if (metaExists.rowCount === 0) {
        const meta = await fetchNftMetadata(mintStr);
        await client.query(
          `INSERT INTO nft_metadata (mint, name, symbol, uri, image_url, description, attributes, animation_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [mintStr, meta.name, meta.symbol, meta.uri, meta.image_url, meta.description, JSON.stringify(meta.attributes), meta.animation_url || null]
        );
      }

      // Find listing PDA
      const [listingPDA] = PublicKey.findProgramAddressSync(
        [marketplace.toBuffer(), nftMint.toBuffer()],
        PROGRAM_ID
      );
      const listingStr = listingPDA.toBase58();

      // Upsert listing
      await client.query(
        `INSERT INTO listings (address, marketplace_address, maker, nft_mint, price, metadata_address, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         ON CONFLICT (address) DO UPDATE 
         SET maker = $3, price = $5, status = 'active', updated_at = CURRENT_TIMESTAMP`,
        [listingStr, marketStr, sellerStr, mintStr, price.toString(), getMetadataPDA(nftMint).toBase58()]
      );
      await invalidateCaches(marketStr, mintStr);

      publishFn = async () => {
        const result = await pool.query(`
          SELECT l.*, m.name as nft_name, m.symbol as nft_symbol, m.image_url, m.animation_url, m.description, m.attributes
          FROM listings l
          JOIN nft_metadata m ON l.nft_mint = m.mint
          WHERE l.address = $1
        `, [listingStr]);
        if (result.rows.length > 0) {
          const row = result.rows[0];
          await publishEvent('marketplace.event', {
            event: 'listed',
            chain: 'solana',
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
              chain: row.chain || 'solana',
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
    
    else if (event.name === 'NFTPurchased') {
      const { nft_mint: nftMint, marketplace, seller, buyer, price } = event.data;
      const mintStr = nftMint.toBase58();
      const marketStr = marketplace.toBase58();

      const [listingPDA] = PublicKey.findProgramAddressSync(
        [marketplace.toBuffer(), nftMint.toBuffer()],
        PROGRAM_ID
      );
      const listingStr = listingPDA.toBase58();

      await client.query(
        `UPDATE listings 
         SET status = 'sold', updated_at = CURRENT_TIMESTAMP 
         WHERE address = $1`,
        [listingStr]
      );
      await invalidateCaches(marketStr, mintStr);

      publishFn = async () => {
        await publishEvent('marketplace.event', {
          event: 'purchased',
          chain: 'solana',
          data: {
            address: listingStr,
            nftMint: mintStr,
            buyer: buyer.toBase58(),
            price: price.toString()
          }
        });
      };
    } 
    
    else if (event.name === 'NFTDelisted') {
      const { nft_mint: nftMint, marketplace } = event.data;
      const marketStr = marketplace.toBase58();

      const [listingPDA] = PublicKey.findProgramAddressSync(
        [marketplace.toBuffer(), nftMint.toBuffer()],
        PROGRAM_ID
      );
      const listingStr = listingPDA.toBase58();

      await client.query(
        `UPDATE listings 
         SET status = 'delisted', updated_at = CURRENT_TIMESTAMP 
         WHERE address = $1`,
        [listingStr]
      );
      await invalidateCaches(marketStr, nftMint.toBase58());

      publishFn = async () => {
        await publishEvent('marketplace.event', {
          event: 'delisted',
          chain: 'solana',
          data: {
            address: listingStr,
            nftMint: nftMint.toBase58()
          }
        });
      };
    } 
    
    else if (event.name === 'FeeUpdated') {
      const { marketplace, new_fee: newFee } = event.data;
      const marketStr = marketplace.toBase58();

      await client.query(
        `UPDATE marketplaces 
         SET fee_bps = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE address = $1`,
        [marketStr, newFee]
      );
      await invalidateCaches(marketStr);
    }

    await client.query('COMMIT');
    if (publishFn) {
      await publishFn().catch(e => console.error('Error in post-commit publishing:', e));
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error handling transaction event:', error);
  } finally {
    client.release();
  }
}

// Perform initial backfill of accounts on startup
export async function runBackfill() {
  console.log('Starting on-chain backfill check...');
  
  try {
    // 1. Fetch and store marketplaces
    const marketplaceAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [{ dataSize: 200 }]
    });
    console.log(`Found ${marketplaceAccounts.length} marketplace account(s) on-chain.`);

    for (const rawAcc of marketplaceAccounts) {
      try {
        const decoded = coder.accounts.decode('Marketplace', rawAcc.account.data);
        await pool.query(
          `INSERT INTO marketplaces (address, name, fee_bps, authority, treasury)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (address) DO UPDATE 
           SET name = $2, fee_bps = $3, authority = $4, treasury = $5`,
          [
            rawAcc.pubkey.toBase58(),
            decoded.name,
            decoded.fee_bps,
            decoded.authority.toBase58(),
            decoded.treasury.toBase58()
          ]
        );
        console.log(`Backfilled marketplace: ${decoded.name} (${rawAcc.pubkey.toBase58()})`);
      } catch (e) {
        console.error(`Error decoding marketplace account ${rawAcc.pubkey.toBase58()}:`, e);
      }
    }

    // 2. Fetch active listings
    const listingAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [{ dataSize: 113 }]
    });
    console.log(`Found ${listingAccounts.length} active listing account(s) on-chain.`);

    // Keep track of active listing addresses found
    const activeAddresses: string[] = [];

    for (const rawAcc of listingAccounts) {
      try {
        const decoded = coder.accounts.decode('Listing', rawAcc.account.data);
        const listingAddress = rawAcc.pubkey.toBase58();
        activeAddresses.push(listingAddress);

        const mintStr = decoded.nft_mint.toBase58();

        // Find marketplace address. Since listing PDA seeds are [marketplacePDA, nftMint]
        // we can derive it from the DB marketplaces or match it.
        // Let's find which marketplace this listing belongs to by querying all DB marketplaces
        const marketplaces = await pool.query('SELECT address FROM marketplaces');
        let matchedMarketplace = '';
        for (const market of marketplaces.rows) {
          const [expectedPDA] = PublicKey.findProgramAddressSync(
            [new PublicKey(market.address).toBuffer(), decoded.nft_mint.toBuffer()],
            PROGRAM_ID
          );
          if (expectedPDA.toBase58() === listingAddress) {
            matchedMarketplace = market.address;
            break;
          }
        }

        if (!matchedMarketplace) {
          console.warn(`Could not match listing ${listingAddress} to any marketplace in database. Skipping.`);
          continue;
        }

        // Ensure NFT Metadata exists in database
        const metaExists = await pool.query('SELECT 1 FROM nft_metadata WHERE mint = $1', [mintStr]);
        if (metaExists.rowCount === 0) {
          const meta = await fetchNftMetadata(mintStr);
          await pool.query(
            `INSERT INTO nft_metadata (mint, name, symbol, uri, image_url, description, attributes, animation_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [mintStr, meta.name, meta.symbol, meta.uri, meta.image_url, meta.description, JSON.stringify(meta.attributes), meta.animation_url || null]
          );
        }

        // Upsert listing
        await pool.query(
          `INSERT INTO listings (address, marketplace_address, maker, nft_mint, price, metadata_address, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'active')
           ON CONFLICT (address) DO UPDATE 
           SET maker = $3, price = $5, status = 'active', updated_at = CURRENT_TIMESTAMP`,
          [
            listingAddress,
            matchedMarketplace,
            decoded.maker.toBase58(),
            mintStr,
            decoded.price.toString(),
            getMetadataPDA(decoded.nft_mint).toBase58()
          ]
        );
        await invalidateCaches(matchedMarketplace, mintStr);
      } catch (e) {
        console.error(`Error decoding listing account ${rawAcc.pubkey.toBase58()}:`, e);
      }
    }

    // Set any listings that are NOT active on-chain but marked as 'active' in DB to 'delisted' or 'sold'
    // (This syncs the database back to actual chain state)
    if (activeAddresses.length > 0) {
      await pool.query(
        `UPDATE listings 
         SET status = 'delisted', updated_at = CURRENT_TIMESTAMP
         WHERE status = 'active' AND address NOT IN (${activeAddresses.map((_, i) => `$${i + 1}`).join(', ')})`,
        activeAddresses
      );
    } else {
      await pool.query("UPDATE listings SET status = 'delisted', updated_at = CURRENT_TIMESTAMP WHERE status = 'active'");
    }

    console.log('Backfill sync successfully completed.');
  } catch (error) {
    console.error('Error during on-chain backfill check:', error);
  }
}

// Start WebSocket log subscription for live indexing
export function startLiveIndexer() {
  console.log(`Starting live log listener for program: ${PROGRAM_ID.toBase58()}...`);
  
  connection.onLogs(
    PROGRAM_ID,
    async (logs, ctx) => {
      if (logs.err) return; // Skip failed transactions
      
      const signature = logs.signature;
      const slot = ctx.slot;
      
      try {
        const txInfo = await connection.getTransaction(signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        });
        
        const blockTime = txInfo?.blockTime || Math.floor(Date.now() / 1000);
        
        const parsedEvents = eventParser.parseLogs(logs.logs);
        for (const event of parsedEvents) {
          await handleEvent(event, signature, slot, blockTime);
        }
      } catch (err) {
        console.error(`Error processing transaction logs for ${signature}:`, err);
      }
    },
    'confirmed'
  );
}
