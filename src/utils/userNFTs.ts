import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { isValidNFT, getCompleteNFTMetadata } from './metaplex';
import type { NFTListing } from '../types/marketplace';

// Interface for user's NFT
export interface UserNFT {
  mint: PublicKey;
  metadata: {
    name: string;
    description: string;
    image: string;
    animationUrl?: string;
    animation_url?: string;
    attributes: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  tokenAccount: PublicKey;
  balance: number;
}

/**
 * Fetch all NFTs owned by a user
 */
export async function fetchUserNFTs(
  connection: Connection,
  userPublicKey: PublicKey
): Promise<UserNFT[]> {
  try {
    console.log(`🔍 [NFT Discovery] Fetching NFTs for user: ${userPublicKey.toBase58()}`);
    console.log(`🌐 [NFT Discovery] RPC Endpoint: ${connection.rpcEndpoint}`);

    // Get all token accounts for the user
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      userPublicKey,
      {
        programId: TOKEN_PROGRAM_ID,
      }
    );

    console.log(`📋 [NFT Discovery] Found ${tokenAccounts.value.length} total token accounts`);

    if (tokenAccounts.value.length === 0) {
      console.log('❌ [NFT Discovery] No token accounts found in wallet');
      return [];
    }

    // Filter for NFTs (tokens with amount = 1 and decimals = 0)  
    const potentialNFTs = tokenAccounts.value.filter(account => {
      const tokenInfo = account.account.data.parsed.info;
      const isNFT = tokenInfo.tokenAmount.amount === '1' && tokenInfo.tokenAmount.decimals === 0;
      
      if (!isNFT) {
        console.log(`⏭️  [NFT Discovery] Skipping fungible token: ${tokenInfo.mint} (amount: ${tokenInfo.tokenAmount.amount}, decimals: ${tokenInfo.tokenAmount.decimals})`);
      }
      
      return isNFT;
    });

    console.log(`🎨 [NFT Discovery] Found ${potentialNFTs.length} potential NFTs (amount=1, decimals=0)`);

    if (potentialNFTs.length === 0) {
      console.log('ℹ️  [NFT Discovery] No NFT-like tokens found. User may not have any NFTs or they might be fungible tokens.');
      return [];
    }

    // Verify which ones are actual NFTs by checking for metadata accounts
    const userNFTs: UserNFT[] = [];
    
    console.log(`🔍 [NFT Discovery] Verifying ${potentialNFTs.length} potential NFTs for metadata...`);
    
    // Process in batches to avoid overwhelming the RPC
    const BATCH_SIZE = 5; // Reduced batch size for better debugging
    for (let i = 0; i < potentialNFTs.length; i += BATCH_SIZE) {
      const batch = potentialNFTs.slice(i, i + BATCH_SIZE);
      console.log(`📦 [NFT Discovery] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(potentialNFTs.length/BATCH_SIZE)} (${batch.length} items)`);
      
      const batchPromises = batch.map(async (tokenAccount, batchIndex) => {
        try {
          const tokenInfo = tokenAccount.account.data.parsed.info;
          const mintPubkey = new PublicKey(tokenInfo.mint);
          const mintString = mintPubkey.toBase58();
          
          console.log(`   🔍 [${batchIndex + 1}] Checking mint: ${mintString}`);
          
          // Check if this mint has metadata (is an NFT)
          const isNFT = await isValidNFT(connection, mintPubkey);
          if (!isNFT) {
            console.log(`   ❌ [${batchIndex + 1}] No metadata account found for ${mintString}`);
            return null;
          }

          console.log(`   ✅ [${batchIndex + 1}] Valid NFT found! Fetching metadata for ${mintString}`);

          // Fetch complete metadata
          const metadata = await getCompleteNFTMetadata(connection, mintPubkey);
          if (!metadata) {
            console.log(`   ⚠️  [${batchIndex + 1}] Failed to fetch metadata for ${mintString}`);
            return null;
          }

          if (!metadata.json) {
            console.log(`   ⚠️  [${batchIndex + 1}] No JSON metadata for ${mintString}`);
            return null;
          }

          console.log(`   🎨 [${batchIndex + 1}] Successfully loaded NFT: "${metadata.json.name}"`);

          return {
            mint: mintPubkey,
            metadata: metadata.json,
            tokenAccount: tokenAccount.pubkey,
            balance: parseInt(tokenInfo.tokenAmount.amount),
          };
        } catch (error) {
          console.error(`   ❌ Error processing potential NFT ${tokenAccount.pubkey.toBase58()}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Add valid NFTs to the result
      batchResults.forEach(nft => {
        if (nft) {
          userNFTs.push(nft);
        }
      });

      console.log(`📦 [NFT Discovery] Batch ${Math.floor(i/BATCH_SIZE) + 1} completed: ${batchResults.filter(n => n).length}/${batch.length} valid NFTs`);

      // Small delay between batches
      if (i + BATCH_SIZE < potentialNFTs.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log(`🎉 [NFT Discovery] Successfully found ${userNFTs.length} NFTs in wallet!`);
    
    if (userNFTs.length === 0) {
      console.log('ℹ️  [NFT Discovery] No valid NFTs found. This could mean:');
      console.log('   - Wallet has no NFTs');
      console.log('   - NFTs don\'t have Metaplex metadata');
      console.log('   - Network/RPC issues');
    } else {
      console.log('🎨 [NFT Discovery] Found NFTs:');
      userNFTs.forEach((nft, i) => {
        console.log(`   ${i + 1}. "${nft.metadata.name}" (${nft.mint.toBase58()})`);
      });
    }
    
    return userNFTs;
  } catch (error) {
    console.error(`Error fetching user NFTs for ${userPublicKey.toBase58()}:`, error);
    return [];
  }
}

/**
 * Convert UserNFT to NFTListing format (for portfolio display)
 */
export function userNFTToListing(userNFT: UserNFT, userAddress: string): NFTListing {
  return {
    id: `owned-${userNFT.mint.toBase58()}`,
    marketplace: 'user-portfolio',
    nftMint: userNFT.mint.toBase58(),
    seller: userAddress,
    price: 0, // Not for sale
    createdAt: Date.now(),
    metadata: userNFT.metadata,
  };
}

/**
 * Get the total estimated value of user's NFTs
 * This is a simplified calculation - in a real app you'd want floor price data
 */
export function calculatePortfolioValue(
  userNFTs: UserNFT[],
  activeListings: NFTListing[]
): number {
  // For now, just sum up the user's active listings
  return activeListings.reduce((total, listing) => total + listing.price, 0);
}

/**
 * Check if user owns a specific NFT
 */
export async function userOwnsNFT(
  connection: Connection,
  userPublicKey: PublicKey,
  mintPublicKey: PublicKey
): Promise<boolean> {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      userPublicKey,
      {
        mint: mintPublicKey,
        programId: TOKEN_PROGRAM_ID,
      }
    );

    // Check if user has a token account with balance > 0
    return tokenAccounts.value.some(account => {
      const tokenInfo = account.account.data.parsed.info;
      return parseInt(tokenInfo.tokenAmount.amount) > 0;
    });
  } catch (error) {
    console.error(`Error checking NFT ownership for ${mintPublicKey.toBase58()}:`, error);
    return false;
  }
}

/**
 * Get user's NFT collection statistics
 */
export function getUserCollectionStats(userNFTs: UserNFT[]) {
  const collections = new Map<string, number>();
  const rarities = new Map<string, number>();
  
  userNFTs.forEach(nft => {
    // Group by collection (using the first part of the name as collection identifier)
    const collectionName = nft.metadata.name.split('#')[0].trim();
    collections.set(collectionName, (collections.get(collectionName) || 0) + 1);
    
    // Group by rarity
    const rarityAttribute = nft.metadata.attributes.find(attr => 
      attr.trait_type.toLowerCase().includes('rarity')
    );
    if (rarityAttribute) {
      const rarity = rarityAttribute.value;
      rarities.set(rarity, (rarities.get(rarity) || 0) + 1);
    }
  });

  return {
    totalNFTs: userNFTs.length,
    uniqueCollections: collections.size,
    collectionBreakdown: Array.from(collections.entries()).map(([name, count]) => ({
      collection: name,
      count,
    })),
    rarityBreakdown: Array.from(rarities.entries()).map(([rarity, count]) => ({
      rarity,
      count,
    })),
  };
}