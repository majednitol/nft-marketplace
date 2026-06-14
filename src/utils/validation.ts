import { PublicKey } from '@solana/web3.js';

// Constants for validation
export const VALIDATION_CONSTANTS = {
  MAX_PRICE_SOL: 1000000, // 1 million SOL max
  MIN_PRICE_SOL: 0.001,   // 0.001 SOL min (1000 lamports)
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_FEE_BPS: 2000,     // 20% max fee
  MIN_FEE_BPS: 0,        // 0% min fee
  SOLANA_ADDRESS_LENGTH: 44, // Base58 encoded public key length
} as const;

// Input validation errors
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates NFT price is within acceptable bounds
 */
export const validateNFTPrice = (price: number): boolean => {
  if (!Number.isFinite(price)) {
    throw new ValidationError('Price must be a valid number', 'price');
  }
  
  if (price < VALIDATION_CONSTANTS.MIN_PRICE_SOL) {
    throw new ValidationError(`Price must be at least ${VALIDATION_CONSTANTS.MIN_PRICE_SOL} SOL`, 'price');
  }
  
  if (price > VALIDATION_CONSTANTS.MAX_PRICE_SOL) {
    throw new ValidationError(`Price cannot exceed ${VALIDATION_CONSTANTS.MAX_PRICE_SOL} SOL`, 'price');
  }
  
  return true;
};

/**
 * Validates Solana public key format
 */
export const validatePublicKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') {
    throw new ValidationError('Public key must be a valid string', 'publicKey');
  }
  
  if (key.length !== VALIDATION_CONSTANTS.SOLANA_ADDRESS_LENGTH) {
    throw new ValidationError('Invalid public key format', 'publicKey');
  }
  
  try {
    new PublicKey(key);
    return true;
  } catch (error) {
    throw new ValidationError('Invalid Solana public key format', 'publicKey');
  }
};

/**
 * Validates marketplace fee is within acceptable range
 */
export const validateMarketplaceFee = (feeBps: number): boolean => {
  if (!Number.isInteger(feeBps)) {
    throw new ValidationError('Fee must be a whole number in basis points', 'fee');
  }
  
  if (feeBps < VALIDATION_CONSTANTS.MIN_FEE_BPS) {
    throw new ValidationError(`Fee cannot be negative`, 'fee');
  }
  
  if (feeBps > VALIDATION_CONSTANTS.MAX_FEE_BPS) {
    throw new ValidationError(`Fee cannot exceed ${VALIDATION_CONSTANTS.MAX_FEE_BPS / 100}%`, 'fee');
  }
  
  return true;
};

/**
 * Validates marketplace name
 */
export const validateMarketplaceName = (name: string): boolean => {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('Marketplace name is required', 'name');
  }
  
  if (name.trim().length === 0) {
    throw new ValidationError('Marketplace name cannot be empty', 'name');
  }
  
  if (name.length > VALIDATION_CONSTANTS.MAX_NAME_LENGTH) {
    throw new ValidationError(`Marketplace name cannot exceed ${VALIDATION_CONSTANTS.MAX_NAME_LENGTH} characters`, 'name');
  }
  
  // Check for potentially dangerous characters
  const dangerousChars = /[<>'"&]/;
  if (dangerousChars.test(name)) {
    throw new ValidationError('Marketplace name contains invalid characters', 'name');
  }
  
  return true;
};

/**
 * Sanitizes string input by removing potentially dangerous characters
 */
export const sanitizeString = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>'"&]/g, '') // Remove HTML/JS injection chars
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .substring(0, VALIDATION_CONSTANTS.MAX_NAME_LENGTH);
};

/**
 * Validates NFT metadata
 */
export const validateNFTMetadata = (metadata: {
  name?: string;
  description?: string;
  image?: string;
}): boolean => {
  if (!metadata.name) {
    throw new ValidationError('NFT name is required', 'metadata.name');
  }
  
  if (metadata.name.length > VALIDATION_CONSTANTS.MAX_NAME_LENGTH) {
    throw new ValidationError(`NFT name cannot exceed ${VALIDATION_CONSTANTS.MAX_NAME_LENGTH} characters`, 'metadata.name');
  }
  
  if (metadata.description && metadata.description.length > VALIDATION_CONSTANTS.MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(`NFT description cannot exceed ${VALIDATION_CONSTANTS.MAX_DESCRIPTION_LENGTH} characters`, 'metadata.description');
  }
  
  if (metadata.image && !isValidUrl(metadata.image)) {
    throw new ValidationError('NFT image must be a valid URL', 'metadata.image');
  }
  
  return true;
};

/**
 * Validates URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Validates transaction signature format
 */
export const validateTransactionSignature = (signature: string): boolean => {
  if (!signature || typeof signature !== 'string') {
    throw new ValidationError('Transaction signature is required', 'signature');
  }
  
  // Solana transaction signatures are typically 88 characters (base58 encoded)
  if (signature.length < 80 || signature.length > 90) {
    throw new ValidationError('Invalid transaction signature format', 'signature');
  }
  
  // Check for valid base58 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (!base58Regex.test(signature)) {
    throw new ValidationError('Transaction signature contains invalid characters', 'signature');
  }
  
  return true;
};

/**
 * Rate limiting validation
 */
export const validateRateLimit = (
  timestamps: number[],
  maxCalls: number,
  windowMs: number
): boolean => {
  const now = Date.now();
  const validCalls = timestamps.filter(timestamp => now - timestamp < windowMs);
  
  if (validCalls.length >= maxCalls) {
    throw new ValidationError(
      `Rate limit exceeded. Maximum ${maxCalls} calls per ${windowMs / 1000} seconds allowed`,
      'rateLimit'
    );
  }
  
  return true;
};