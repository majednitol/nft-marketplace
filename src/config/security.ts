// Security configuration for the NFT marketplace
export const SECURITY_CONFIG = {
  // Content Security Policy
  CSP: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://api.devnet.solana.com"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:", "http:"],
    connectSrc: [
      "'self'",
      "https://api.devnet.solana.com",
      "https://api.mainnet-beta.solana.com",
      "https://gateway.pinata.cloud",
      "wss://api.devnet.solana.com",
      "wss://api.mainnet-beta.solana.com"
    ],
    fontSrc: ["'self'", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },

  // CORS Configuration
  CORS: {
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001', 
      'https://nft-marketplace-blessedbiello.vercel.app'
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  },

  // API Security
  API: {
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // limit each IP to 100 requests per windowMs
    },
    timeout: 30000, // 30 seconds
    maxPayloadSize: '10mb',
  },

  // Wallet Security
  WALLET: {
    allowedWallets: [
      'Phantom',
      'Solflare', 
      'Torus',
      'Ledger',
      'Sollet',
      'MathWallet',
      'Coin98'
    ],
    connectionTimeout: 30000,
    maxConnectionAttempts: 3,
  },

  // Transaction Security
  TRANSACTIONS: {
    maxRetries: 3,
    timeout: 60000,
    confirmationTimeout: 30000,
    maxSlippage: 0.05, // 5%
    priorityFeeRange: {
      min: 0,
      max: 0.01, // 0.01 SOL max priority fee
    },
  },

  // Input Validation
  INPUT_VALIDATION: {
    maxStringLength: 1000,
    maxArrayLength: 100,
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxImageSize: 10 * 1024 * 1024, // 10MB
    allowedFileExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },

  // Session Security
  SESSION: {
    timeout: 24 * 60 * 60 * 1000, // 24 hours
    refreshThreshold: 60 * 60 * 1000, // 1 hour
    maxConcurrentSessions: 3,
  },

  // Audit & Logging
  AUDIT: {
    enableLogging: true,
    logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
    retentionDays: 30,
    sensitiveFields: ['privateKey', 'mnemonic', 'password'],
  },
} as const;

// Security headers for production
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': Object.entries(SECURITY_CONFIG.CSP)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()} ${Array.isArray(value) ? value.join(' ') : value}`)
    .join('; '),
} as const;

// Validate security configuration on startup
export const validateSecurityConfig = (): boolean => {
  try {
    // Check required environment variables
    const requiredEnvVars = [
      'VITE_PROGRAM_ID',
      'VITE_SOLANA_NETWORK',
      'VITE_SOLANA_RPC_URL'
    ];

    for (const envVar of requiredEnvVars) {
      if (!import.meta.env[envVar]) {
        console.error(`Missing required environment variable: ${envVar}`);
        return false;
      }
    }

    // Validate network configuration
    const network = import.meta.env.VITE_SOLANA_NETWORK;
    if (!['devnet', 'testnet', 'mainnet-beta'].includes(network)) {
      console.error(`Invalid Solana network: ${network}`);
      return false;
    }

    // Validate program ID format
    const programId = import.meta.env.VITE_PROGRAM_ID;
    if (!/^[A-Za-z0-9]{32,44}$/.test(programId)) {
      console.error(`Invalid program ID format: ${programId}`);
      return false;
    }

    console.log('Security configuration validated successfully');
    return true;
  } catch (error) {
    console.error('Security configuration validation failed:', error);
    return false;
  }
};