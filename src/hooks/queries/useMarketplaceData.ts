import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useSolanaProgram } from '../useSolanaProgram';
import { queryKeys, invalidateQueries } from '../../lib/queryClient';
import { toast } from 'react-hot-toast';
import { classifyError, formatErrorForUser } from '../../utils/errors';
import type { Marketplace, NFTListing, MarketplaceStats, UserPortfolio } from '../../types/marketplace';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getCompleteNFTMetadata, batchFetchNFTMetadata } from '../../utils/metaplex';
import { fetchUserNFTs, userNFTToListing } from '../../utils/userNFTs';

// Fetch marketplace data
export const useMarketplaceQuery = () => {
  const { program, fetchMarketplace } = useSolanaProgram();
  
  return useQuery({
    queryKey: queryKeys.marketplace,
    queryFn: async (): Promise<Marketplace | null> => {
      if (!program || !fetchMarketplace) throw new Error('Program not available');
      
      try {
        const marketplaceData = await fetchMarketplace();
        
        if (!marketplaceData) {
          return null; // Marketplace not initialized
        }
        
        return {
          id: 'marketplace-account',
          authority: marketplaceData.authority.toBase58(),
          name: marketplaceData.name,
          fee: marketplaceData.feeBps / 100, // Convert basis points to percentage
          treasury: marketplaceData.treasury.toBase58(),
          totalListings: 0, // Will be calculated from listings query
          totalSales: 0, // Not tracked in marketplace account
          totalVolume: 0, // Will be calculated from historical data
          createdAt: new Date().toISOString(), // Placeholder - could track via events
        };
      } catch (error) {
        const classifiedError = classifyError(error);
        throw classifiedError;
      }
    },
    enabled: !!program && !!fetchMarketplace,
    retry: 1, // Don't retry too many times for uninitialized marketplace
  });
};

// Fetch marketplace statistics
export const useMarketplaceStatsQuery = () => {
  const { program, fetchAllListings, lamportsToSol } = useSolanaProgram();
  
  return useQuery({
    queryKey: queryKeys.marketplaceStats,
    queryFn: async (): Promise<MarketplaceStats> => {
      if (!program || !fetchAllListings) throw new Error('Program not available');
      
      try {
        const listings = await fetchAllListings();
        
        // Calculate real stats from blockchain data
        const totalListings = listings.length;
        const totalVolume = listings.reduce((sum, listing) => sum + lamportsToSol(listing.price), 0);
        const averagePrice = totalListings > 0 ? totalVolume / totalListings : 0;
        const uniqueOwners = new Set(listings.map(listing => listing.maker.toBase58())).size;
        const floorPrice = totalListings > 0 ? Math.min(...listings.map(listing => lamportsToSol(listing.price))) : 0;
        
        return {
          totalListings,
          totalSales: 0, // Not tracked - would need event listening or off-chain tracking
          totalVolume,
          averagePrice,
          uniqueOwners,
          floorPrice,
        };
      } catch (error) {
        const classifiedError = classifyError(error);
        throw classifiedError;
      }
    },
    enabled: !!program && !!fetchAllListings,
    // Refresh stats every 30 seconds
    refetchInterval: 30000,
  });
};

// Fetch all listings
export const useListingsQuery = () => {
  const { program, fetchAllListings } = useSolanaProgram();
  const { connection } = useConnection();
  
  return useQuery({
    queryKey: queryKeys.listingsAll,
    queryFn: async (): Promise<NFTListing[]> => {
      if (!program || !fetchAllListings) throw new Error('Program or fetchAllListings not available');
      
      try {
        const listings = await fetchAllListings();
        
        // Fetch real NFT metadata
        const nftMints = listings.map(listing => listing.nftMint);
        const metadataMap = await batchFetchNFTMetadata(connection, nftMints);
        
        return Promise.all(listings.map(async (listing) => {
          const mintString = listing.nftMint.toBase58();
          
          // Get metadata from cache or fetch individually
          let metadata = metadataMap.get(mintString);
          if (!metadata) {
            try {
              metadata = await getCompleteNFTMetadata(connection, listing.nftMint);
            } catch (error) {
              console.warn(`Failed to fetch metadata for ${mintString}:`, error);
            }
          }

          return {
            id: listing.publicKey.toBase58(),
            marketplace: 'nft-nexus-marketplace',
            seller: listing.maker.toBase58(),
            nftMint: mintString,
            price: listing.price.toNumber() / LAMPORTS_PER_SOL,
            createdAt: Date.now(), // TODO: Get actual creation timestamp from events
            metadata: metadata?.json || {
              name: `NFT ${mintString.slice(0, 8)}`,
              description: 'NFT metadata unavailable',
              image: '',
              attributes: [],
            },
          };
        }));
      } catch (error) {
        const classifiedError = classifyError(error);
        throw classifiedError;
      }
    },
    enabled: !!program && !!fetchAllListings,
    // Refresh listings every minute
    refetchInterval: 60000,
  });
};

// Fetch user portfolio
export const useUserPortfolioQuery = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { program, fetchAllListings } = useSolanaProgram();
  
  return useQuery({
    queryKey: queryKeys.userPortfolio(publicKey?.toBase58() || ''),
    queryFn: async (): Promise<UserPortfolio> => {
      if (!program || !publicKey || !connection || !fetchAllListings) throw new Error('Program, connection, fetchAllListings, or wallet not available');
      
      try {
        // Fetch user's owned NFTs
        const userNFTs = await fetchUserNFTs(connection, publicKey);
        const ownedNFTListings = userNFTs.map(nft => 
          userNFTToListing(nft, publicKey.toBase58())
        );
        
        // Fetch user's active listings
        const allListings = await fetchAllListings();
        const userListings = allListings
          .filter(listing => listing.maker.equals(publicKey))
          .map(listing => listing.nftMint);
        
        // Get metadata for user's listings
        const listingMetadataMap = await batchFetchNFTMetadata(connection, userListings);
        
        const listedNFTs: NFTListing[] = allListings
          .filter(listing => listing.maker.equals(publicKey))
          .map(listing => {
            const mintString = listing.nftMint.toBase58();
            const metadata = listingMetadataMap.get(mintString);
            
            return {
              id: listing.publicKey.toBase58(),
              marketplace: 'nft-nexus-marketplace',
              seller: publicKey.toBase58(),
              nftMint: mintString,
              price: listing.price.toNumber() / LAMPORTS_PER_SOL,
              createdAt: Date.now(),
              metadata: metadata?.json || {
                name: `NFT ${mintString.slice(0, 8)}`,
                description: 'NFT metadata unavailable',
                image: '',
                attributes: [],
              },
            };
          });
        
        // Calculate total value
        const totalValue = listedNFTs.reduce((sum, listing) => sum + listing.price, 0);
        
        return {
          ownedNFTs: ownedNFTListings,
          listedNFTs: listedNFTs,
          totalValue: totalValue,
          totalListings: listedNFTs.length,
        };
      } catch (error) {
        const classifiedError = classifyError(error);
        throw classifiedError;
      }
    },
    enabled: !!program && !!publicKey && !!connection && !!fetchAllListings,
    // Refresh portfolio data every 2 minutes
    refetchInterval: 120000,
  });
};

// Mutation for listing NFT
export const useListNFTMutation = () => {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      nftMint, 
      price, 
      metadata 
    }: { 
      nftMint: string; 
      price: number; 
      metadata: any; 
    }) => {
      if (!program || !publicKey) throw new Error('Program or wallet not available');
      
      try {
        // This would call the actual program method
        const signature = await program.methods
          .listNft()
          .accounts({
            maker: publicKey,
            // ... other accounts
          })
          .rpc();
          
        return signature;
      } catch (error) {
        const classifiedError = classifyError(error);
        throw classifiedError;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      invalidateQueries.listings();
      if (publicKey) {
        invalidateQueries.userPortfolio(publicKey.toBase58());
      }
      invalidateQueries.marketplace();
      
      toast.success('NFT listed successfully!');
    },
    onError: (error) => {
      const userMessage = formatErrorForUser(error);
      toast.error(userMessage);
    },
  });
};

// Mutation for purchasing NFT
export const usePurchaseNFTMutation = () => {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!program || !publicKey) throw new Error('Program or wallet not available');
      
      try {
        const signature = await program.methods
          .purchaseNft()
          .accounts({
            buyer: publicKey,
            // ... other accounts
          })
          .rpc();
          
        return signature;
      } catch (error) {
        const classifiedError = classifyError(error);
        throw classifiedError;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      invalidateQueries.listings();
      if (publicKey) {
        invalidateQueries.userPortfolio(publicKey.toBase58());
        invalidateQueries.userBalance(publicKey.toBase58());
      }
      invalidateQueries.marketplace();
      
      toast.success('NFT purchased successfully!');
    },
    onError: (error) => {
      const userMessage = formatErrorForUser(error);
      toast.error(userMessage);
    },
  });
};

// Mutation for delisting NFT
export const useDelistNFTMutation = () => {
  const { program } = useSolanaProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!program || !publicKey) throw new Error('Program or wallet not available');
      
      try {
        const signature = await program.methods
          .delistNft()
          .accounts({
            maker: publicKey,
            // ... other accounts
          })
          .rpc();
          
        return signature;
      } catch (error) {
        const classifiedError = classifyError(error);
        throw classifiedError;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      invalidateQueries.listings();
      if (publicKey) {
        invalidateQueries.userPortfolio(publicKey.toBase58());
      }
      invalidateQueries.marketplace();
      
      toast.success('NFT delisted successfully!');
    },
    onError: (error) => {
      const userMessage = formatErrorForUser(error);
      toast.error(userMessage);
    },
  });
};