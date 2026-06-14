// Transaction safety constants
export const TRANSACTION_SAFETY = {
  MAX_RETRIES: 3,
  TIMEOUT_MS: 60000, // 60 seconds
  CONFIRMATION_TIMEOUT: 30000, // 30 seconds
  MIN_CONFIRMATION_DELAY: 1000, // 1 second
  MAX_CONFIRMATION_DELAY: 5000, // 5 seconds
} as const;

// Rate limiting constants
export const RATE_LIMITS = {
  TRANSACTIONS_PER_MINUTE: 10,
  QUERIES_PER_MINUTE: 60,
  WALLET_CONNECTIONS_PER_MINUTE: 5,
  WINDOW_MS: 60000, // 1 minute
} as const;

// UI Constants
export const UI_CONSTANTS = {
  TOAST_DURATION: 4000,
  LOADING_DELAY: 200, // Delay before showing loading spinner
  DEBOUNCE_DELAY: 300,
  POLLING_INTERVAL: 30000, // 30 seconds for data refresh
} as const;

// Blockchain Constants
export const BLOCKCHAIN_CONSTANTS = {
  SOLANA_DECIMALS: 9,
  LAMPORTS_PER_SOL: 1000000000,
  MIN_RENT_EXEMPTION: 0.00203928, // Approximate minimum rent exemption in SOL
  COMPUTE_UNIT_PRICE: 1000,
  COMPUTE_UNIT_LIMIT: 300000,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet to continue',
  INSUFFICIENT_BALANCE: 'Insufficient balance for this transaction',
  TRANSACTION_FAILED: 'Transaction failed. Please try again',
  NETWORK_ERROR: 'Network error. Please check your connection',
  INVALID_INPUT: 'Invalid input provided',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait and try again',
  MARKETPLACE_NOT_INITIALIZED: 'Marketplace not initialized',
  LISTING_NOT_FOUND: 'NFT listing not found',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  UNKNOWN_ERROR: 'An unexpected error occurred',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  WALLET_CONNECTED: 'Wallet connected successfully',
  TRANSACTION_CONFIRMED: 'Transaction confirmed successfully',
  NFT_LISTED: 'NFT listed successfully',
  NFT_PURCHASED: 'NFT purchased successfully',
  NFT_DELISTED: 'NFT delisted successfully',
  MARKETPLACE_INITIALIZED: 'Marketplace initialized successfully',
  FEE_UPDATED: 'Marketplace fee updated successfully',
} as const;

// Default values
export const DEFAULT_VALUES = {
  MARKETPLACE_FEE_BPS: 250, // 2.5%
  NFT_IMAGE_PLACEHOLDER: '/placeholder-nft.png',
  USER_AVATAR_PLACEHOLDER: '/placeholder-avatar.png',
  ITEMS_PER_PAGE: 20,
  MAX_VISIBLE_PAGES: 5,
} as const;

// API Endpoints (for future backend integration)
export const API_ENDPOINTS = {
  HEALTH: '/health',
  METADATA: '/metadata',
  UPLOAD: '/upload',
  ANALYTICS: '/analytics',
} as const;