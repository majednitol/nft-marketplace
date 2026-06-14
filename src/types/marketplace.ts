export interface Marketplace {
  id: string;
  authority: string;
  name: string;
  fee: number;
  treasury: string;
  totalListings: number;
  totalSales: number;
  totalVolume: number;
  createdAt: string;
  rateLimit?: number;
}

export interface NFTListing {
  id: string;
  marketplace: string;
  seller: string;
  nftMint: string;
  price: number;
  createdAt: number;
  metadata: NFTMetadata;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  animationUrl?: string;
  animation_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  collection?: {
    name: string;
    family: string;
  };
  creators?: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
}

export interface UserPortfolio {
  ownedNFTs: NFTListing[];
  listedNFTs: NFTListing[];
  totalValue: number;
  totalListings: number;
}

export interface Transaction {
  id: string;
  type: 'purchase' | 'sale' | 'list' | 'delist';
  nft: NFTListing;
  price?: number;
  timestamp: number;
  signature: string;
}

export interface MarketplaceStats {
  totalListings: number;
  totalSales: number;
  totalVolume: number;
  averagePrice: number;
  uniqueOwners: number;
  floorPrice: number;
}

export interface ProgramError {
  code: number;
  message: string;
}