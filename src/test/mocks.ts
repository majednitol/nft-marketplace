import { vi } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import type { NFTListing, Marketplace, MarketplaceStats, UserPortfolio } from '../types/marketplace';

// Mock Solana PublicKey for testing
export const mockPublicKey = new PublicKey('11111111111111111111111111111112');

// Mock wallet adapter
export const mockWallet = {
  publicKey: mockPublicKey,
  connected: true,
  connecting: false,
  disconnecting: false,
  signTransaction: vi.fn(),
  signAllTransactions: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

// Mock connection
export const mockConnection = {
  commitment: 'confirmed',
  getBalance: vi.fn().mockResolvedValue(1000000000), // 1 SOL
  getLatestBlockhash: vi.fn().mockResolvedValue({
    blockhash: 'mock-blockhash',
    lastValidBlockHeight: 123456,
  }),
  sendRawTransaction: vi.fn().mockResolvedValue('mock-signature'),
  confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
};

// Mock Solana program
export const mockProgram = {
  methods: {
    initializeMarketplace: vi.fn().mockReturnValue({
      accounts: vi.fn().mockReturnValue({
        rpc: vi.fn().mockResolvedValue('mock-transaction-signature'),
      }),
    }),
    listNft: vi.fn().mockReturnValue({
      accounts: vi.fn().mockReturnValue({
        rpc: vi.fn().mockResolvedValue('mock-transaction-signature'),
      }),
    }),
    purchaseNft: vi.fn().mockReturnValue({
      accounts: vi.fn().mockReturnValue({
        rpc: vi.fn().mockResolvedValue('mock-transaction-signature'),
      }),
    }),
    delistNft: vi.fn().mockReturnValue({
      accounts: vi.fn().mockReturnValue({
        rpc: vi.fn().mockResolvedValue('mock-transaction-signature'),
      }),
    }),
  },
  account: {
    marketplace: {
      fetch: vi.fn().mockResolvedValue({
        authority: mockPublicKey,
        feeBps: 250,
        name: 'Test Marketplace',
        treasury: mockPublicKey,
        marketplaceBump: 255,
        treasuryBump: 254,
      }),
    },
    listing: {
      fetch: vi.fn().mockResolvedValue({
        maker: mockPublicKey,
        nftMint: mockPublicKey,
        price: 1000000000, // 1 SOL in lamports
        metadata: mockPublicKey,
        bump: 255,
      }),
      all: vi.fn().mockResolvedValue([
        {
          publicKey: mockPublicKey,
          account: {
            maker: mockPublicKey,
            nftMint: mockPublicKey,
            price: 1000000000,
            metadata: mockPublicKey,
            bump: 255,
          },
        },
      ]),
    },
  },
};

// Mock toast notifications
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  loading: vi.fn(),
  dismiss: vi.fn(),
};

// Mock NFT listing data
export const mockNFTListing: NFTListing = {
  id: 'mock-listing-1',
  marketplace: 'mock-marketplace',
  seller: mockPublicKey.toBase58(),
  nftMint: mockPublicKey.toBase58(),
  price: 1.5,
  createdAt: Date.now(),
  metadata: {
    name: 'Mock NFT #1',
    description: 'A test NFT for testing purposes',
    image: 'https://example.com/mock-nft.jpg',
    attributes: [
      { trait_type: 'Background', value: 'Blue' },
      { trait_type: 'Rarity', value: 'Common' },
    ],
  },
};

// Mock marketplace data
export const mockMarketplace: Marketplace = {
  id: 'mock-marketplace',
  authority: mockPublicKey.toBase58(),
  name: 'Test Marketplace',
  fee: 2.5,
  treasury: mockPublicKey.toBase58(),
  totalListings: 10,
  totalSales: 5,
  totalVolume: 15.5,
  createdAt: new Date().toISOString(),
};

// Mock marketplace stats
export const mockMarketplaceStats: MarketplaceStats = {
  totalListings: 10,
  totalSales: 5,
  totalVolume: 15.5,
  averagePrice: 3.1,
  uniqueOwners: 8,
  floorPrice: 1.0,
};

// Mock user portfolio
export const mockUserPortfolio: UserPortfolio = {
  ownedNFTs: [mockNFTListing],
  listedNFTs: [mockNFTListing],
  totalValue: 3.0,
  totalListings: 2,
};

// Mock environment variables
export const setupMockEnv = () => {
  vi.stubEnv('VITE_PROGRAM_ID', 'FvdEiEPJUEMUZ7HCkK2gPfYGFXCbUB68mTJufdC9BjC5');
  vi.stubEnv('VITE_SOLANA_NETWORK', 'devnet');
  vi.stubEnv('VITE_SOLANA_RPC_URL', 'https://api.devnet.solana.com');
  vi.stubEnv('VITE_MARKETPLACE_NAME', 'NFT-Nexus-Test');
};

// Helper to create mock React Context providers
export const createMockProvider = <T>(value: T) => {
  const MockProvider = ({ children }: { children: React.ReactNode }) => {
    return children as any;
  };
  
  const useMockContext = () => value;
  
  return { MockProvider, useMockContext };
};

// Helper to wait for async operations in tests
export const waitFor = (condition: () => boolean, timeout = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
      } else {
        setTimeout(check, 10);
      }
    };
    
    check();
  });
};

// Mock error instances for testing
export const mockErrors = {
  walletNotConnected: new Error('Wallet not connected'),
  transactionFailed: new Error('Transaction failed'),
  networkError: new Error('Network error'),
  validationError: new Error('Validation error'),
  rateLimitError: new Error('Rate limit exceeded'),
};