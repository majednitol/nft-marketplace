// Standalone NFT fetcher that doesn't depend on Anchor program
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getCompleteNFTMetadata, isValidNFT } from './metaplex';
import type { UserNFT } from './userNFTs';

/**
 * Standalone NFT fetcher for a specific wallet
 * This bypasses the broken Anchor program and fetches NFTs directly
 */
export async function fetchWalletNFTsStandalone(
  walletAddress: string,
  rpcEndpoint: string = 'https://api.devnet.solana.com'
): Promise<UserNFT[]> {
  try {
    console.log(`🚀 [Standalone] Fetching NFTs for wallet: ${walletAddress}`);
    console.log(`🌐 [Standalone] RPC Endpoint: ${rpcEndpoint}`);

    const connection = new Connection(rpcEndpoint, 'confirmed');
    const userPublicKey = new PublicKey(walletAddress);

    // Step 1: Get all token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      userPublicKey,
      { programId: TOKEN_PROGRAM_ID }
    );

    console.log(`📋 [Standalone] Found ${tokenAccounts.value.length} total token accounts`);

    if (tokenAccounts.value.length === 0) {
      console.log('❌ [Standalone] No token accounts found');
      return [];
    }

    // Step 2: Filter for potential NFTs (amount=1, decimals=0)
    const potentialNFTs = tokenAccounts.value.filter(account => {
      const tokenInfo = account.account.data.parsed.info;
      const isNFTLike = tokenInfo.tokenAmount.amount === '1' && tokenInfo.tokenAmount.decimals === 0;
      
      if (isNFTLike) {
        console.log(`🎨 [Standalone] Found potential NFT: ${tokenInfo.mint}`);
      }
      
      return isNFTLike;
    });

    console.log(`🎨 [Standalone] Found ${potentialNFTs.length} potential NFTs`);

    if (potentialNFTs.length === 0) {
      console.log('ℹ️  [Standalone] No NFT-like tokens found');
      return [];
    }

    // Step 3: Verify and fetch metadata for each potential NFT
    const userNFTs: UserNFT[] = [];
    
    console.log(`🔍 [Standalone] Verifying ${potentialNFTs.length} potential NFTs...`);
    
    for (let i = 0; i < potentialNFTs.length; i++) {
      const tokenAccount = potentialNFTs[i];
      const tokenInfo = tokenAccount.account.data.parsed.info;
      const mintPubkey = new PublicKey(tokenInfo.mint);
      const mintString = mintPubkey.toBase58();
      
      console.log(`🔍 [Standalone] [${i + 1}/${potentialNFTs.length}] Checking mint: ${mintString}`);
      
      try {
        // Check if this mint has metadata (is a real NFT)
        const isNFT = await isValidNFT(connection, mintPubkey);
        if (!isNFT) {
          console.log(`   ❌ [${i + 1}] No metadata account found for ${mintString}`);
          continue;
        }

        console.log(`   ✅ [${i + 1}] Valid NFT found! Fetching metadata...`);

        // Fetch complete metadata
        const metadata = await getCompleteNFTMetadata(connection, mintPubkey);
        if (!metadata || !metadata.json) {
          console.log(`   ⚠️  [${i + 1}] Failed to fetch complete metadata for ${mintString}`);
          continue;
        }

        console.log(`   🎨 [${i + 1}] Successfully loaded NFT: "${metadata.json.name}"`);

        // Add to results
        userNFTs.push({
          mint: mintPubkey,
          metadata: metadata.json,
          tokenAccount: tokenAccount.pubkey,
          balance: parseInt(tokenInfo.tokenAmount.amount),
        });

      } catch (error) {
        console.error(`   ❌ [${i + 1}] Error processing NFT ${mintString}:`, error);
      }
    }

    console.log(`🎉 [Standalone] Successfully found ${userNFTs.length} valid NFTs!`);
    
    if (userNFTs.length > 0) {
      console.log('🎨 [Standalone] Found NFTs:');
      userNFTs.forEach((nft, i) => {
        console.log(`   ${i + 1}. "${nft.metadata.name}" (${nft.mint.toBase58()})`);
      });
    }

    return userNFTs;
    
  } catch (error) {
    console.error(`❌ [Standalone] Error fetching NFTs for ${walletAddress}:`, error);
    return [];
  }
}

/**
 * Test function to verify a specific NFT
 */
export async function testSpecificNFT(
  mintAddress: string,
  rpcEndpoint: string = 'https://api.devnet.solana.com'
): Promise<boolean> {
  try {
    console.log(`🧪 [Test] Testing specific NFT: ${mintAddress}`);
    
    const connection = new Connection(rpcEndpoint, 'confirmed');
    const mintPubkey = new PublicKey(mintAddress);
    
    // Check if it's a valid NFT
    const isNFT = await isValidNFT(connection, mintPubkey);
    console.log(`   Valid NFT: ${isNFT ? '✅' : '❌'}`);
    
    if (isNFT) {
      // Fetch metadata
      const metadata = await getCompleteNFTMetadata(connection, mintPubkey);
      if (metadata && metadata.json) {
        console.log(`   Name: "${metadata.json.name}"`);
        console.log(`   Description: "${metadata.json.description}"`);
        console.log(`   Image: "${metadata.json.image}"`);
        console.log(`   ✅ Test passed!`);
        return true;
      }
    }
    
    console.log(`   ❌ Test failed`);
    return false;
    
  } catch (error) {
    console.error(`❌ [Test] Error testing NFT ${mintAddress}:`, error);
    return false;
  }
}