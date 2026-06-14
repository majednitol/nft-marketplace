import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 3 times
      retry: 3,
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for real-time data
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect to avoid spam
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Shorter retry delay for mutations
      retryDelay: 1000,
    },
  },
});

// Query keys for type safety and consistency
export const queryKeys = {
  // Marketplace data
  marketplace: ['marketplace'] as const,
  marketplaceStats: ['marketplace', 'stats'] as const,
  
  // NFT listings
  listings: ['listings'] as const,
  listingsAll: ['listings', 'all'] as const,
  listingsByOwner: (owner: string) => ['listings', 'owner', owner] as const,
  listing: (id: string) => ['listings', id] as const,
  
  // User data
  user: ['user'] as const,
  userPortfolio: (publicKey: string) => ['user', 'portfolio', publicKey] as const,
  userBalance: (publicKey: string) => ['user', 'balance', publicKey] as const,
  
  // NFT metadata
  nftMetadata: (mint: string) => ['nft', 'metadata', mint] as const,
  
  // Favorites
  favorites: ['favorites'] as const,
} as const;

// Cache invalidation helpers
export const invalidateQueries = {
  marketplace: () => queryClient.invalidateQueries({ queryKey: queryKeys.marketplace }),
  listings: () => queryClient.invalidateQueries({ queryKey: queryKeys.listings }),
  userPortfolio: (publicKey: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.userPortfolio(publicKey) }),
  userBalance: (publicKey: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.userBalance(publicKey) }),
  all: () => queryClient.invalidateQueries(),
};