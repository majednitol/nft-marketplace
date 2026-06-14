import { describe, it, expect } from 'vitest';
import {
  validateNFTPrice,
  validatePublicKey,
  validateMarketplaceFee,
  validateMarketplaceName,
  validateNFTMetadata,
  validateTransactionSignature,
  validateRateLimit,
  sanitizeString,
  isValidUrl,
  ValidationError,
  VALIDATION_CONSTANTS,
} from '../validation';

describe('validation utilities', () => {
  describe('validateNFTPrice', () => {
    it('should accept valid prices', () => {
      expect(() => validateNFTPrice(1.0)).not.toThrow();
      expect(() => validateNFTPrice(0.001)).not.toThrow();
      expect(() => validateNFTPrice(100)).not.toThrow();
    });

    it('should reject prices below minimum', () => {
      expect(() => validateNFTPrice(0.0005)).toThrow(ValidationError);
      expect(() => validateNFTPrice(0)).toThrow(ValidationError);
    });

    it('should reject prices above maximum', () => {
      expect(() => validateNFTPrice(VALIDATION_CONSTANTS.MAX_PRICE_SOL + 1)).toThrow(ValidationError);
    });

    it('should reject invalid number types', () => {
      expect(() => validateNFTPrice(NaN)).toThrow(ValidationError);
      expect(() => validateNFTPrice(Infinity)).toThrow(ValidationError);
      expect(() => validateNFTPrice(-Infinity)).toThrow(ValidationError);
    });

    it('should throw ValidationError with correct field', () => {
      try {
        validateNFTPrice(-1);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('price');
      }
    });
  });

  describe('validatePublicKey', () => {
    it('should accept valid Solana public keys', () => {
      const validKey = 'FvdEiEPJUEMUZ7HCkK2gPfYGFXCbUB68mTJufdC9BjC5'; // Valid 44-char base58 public key
      expect(() => validatePublicKey(validKey)).not.toThrow();
    });

    it('should reject invalid public key formats', () => {
      expect(() => validatePublicKey('')).toThrow(ValidationError);
      expect(() => validatePublicKey('invalid-key')).toThrow(ValidationError);
      expect(() => validatePublicKey('123')).toThrow(ValidationError);
    });

    it('should reject non-string inputs', () => {
      expect(() => validatePublicKey(null as any)).toThrow(ValidationError);
      expect(() => validatePublicKey(undefined as any)).toThrow(ValidationError);
      expect(() => validatePublicKey(123 as any)).toThrow(ValidationError);
    });

    it('should throw ValidationError with correct field', () => {
      try {
        validatePublicKey('invalid');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('publicKey');
      }
    });
  });

  describe('validateMarketplaceFee', () => {
    it('should accept valid fee ranges', () => {
      expect(() => validateMarketplaceFee(0)).not.toThrow();
      expect(() => validateMarketplaceFee(250)).not.toThrow(); // 2.5%
      expect(() => validateMarketplaceFee(1000)).not.toThrow(); // 10%
    });

    it('should reject fees outside valid range', () => {
      expect(() => validateMarketplaceFee(-1)).toThrow(ValidationError);
      expect(() => validateMarketplaceFee(VALIDATION_CONSTANTS.MAX_FEE_BPS + 1)).toThrow(ValidationError);
    });

    it('should reject non-integer values', () => {
      expect(() => validateMarketplaceFee(1.5)).toThrow(ValidationError);
      expect(() => validateMarketplaceFee(NaN)).toThrow(ValidationError);
    });
  });

  describe('validateMarketplaceName', () => {
    it('should accept valid marketplace names', () => {
      expect(() => validateMarketplaceName('My Marketplace')).not.toThrow();
      expect(() => validateMarketplaceName('NFT-Store')).not.toThrow();
      expect(() => validateMarketplaceName('123 Market')).not.toThrow();
    });

    it('should reject empty or invalid names', () => {
      expect(() => validateMarketplaceName('')).toThrow(ValidationError);
      expect(() => validateMarketplaceName('   ')).toThrow(ValidationError);
      expect(() => validateMarketplaceName(null as any)).toThrow(ValidationError);
    });

    it('should reject names with dangerous characters', () => {
      expect(() => validateMarketplaceName('Market<script>')).toThrow(ValidationError);
      expect(() => validateMarketplaceName('Market"quote')).toThrow(ValidationError);
      expect(() => validateMarketplaceName("Market'quote")).toThrow(ValidationError);
    });

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(VALIDATION_CONSTANTS.MAX_NAME_LENGTH + 1);
      expect(() => validateMarketplaceName(longName)).toThrow(ValidationError);
    });
  });

  describe('validateNFTMetadata', () => {
    it('should accept valid metadata', () => {
      const validMetadata = {
        name: 'Test NFT',
        description: 'A test NFT',
        image: 'https://example.com/image.jpg',
      };
      expect(() => validateNFTMetadata(validMetadata)).not.toThrow();
    });

    it('should require name field', () => {
      const invalidMetadata = {
        description: 'A test NFT',
        image: 'https://example.com/image.jpg',
      };
      expect(() => validateNFTMetadata(invalidMetadata)).toThrow(ValidationError);
    });

    it('should validate image URL format', () => {
      const invalidMetadata = {
        name: 'Test NFT',
        image: 'invalid-url',
      };
      expect(() => validateNFTMetadata(invalidMetadata)).toThrow(ValidationError);
    });

    it('should validate description length', () => {
      const invalidMetadata = {
        name: 'Test NFT',
        description: 'a'.repeat(VALIDATION_CONSTANTS.MAX_DESCRIPTION_LENGTH + 1),
      };
      expect(() => validateNFTMetadata(invalidMetadata)).toThrow(ValidationError);
    });
  });

  describe('sanitizeString', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeString('Hello<script>alert(1)</script>')).toBe('Helloscriptalert(1)/script');
      expect(sanitizeString('Test "quotes" and \'apostrophes\'')).toBe('Test quotes and apostrophes');
    });

    it('should normalize whitespace', () => {
      expect(sanitizeString('  multiple   spaces  ')).toBe('multiple spaces');
      expect(sanitizeString('tab\tand\nnewline')).toBe('tab and newline');
    });

    it('should handle empty or invalid inputs', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
    });

    it('should limit string length', () => {
      const longString = 'a'.repeat(VALIDATION_CONSTANTS.MAX_NAME_LENGTH + 10);
      const result = sanitizeString(longString);
      expect(result.length).toBe(VALIDATION_CONSTANTS.MAX_NAME_LENGTH);
    });
  });

  describe('isValidUrl', () => {
    it('should accept valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://example.com/path/to/resource.jpg')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('validateTransactionSignature', () => {
    it('should accept valid transaction signatures', () => {
      const validSignature = '5' + 'a'.repeat(87); // 88 characters total
      expect(() => validateTransactionSignature(validSignature)).not.toThrow();
    });

    it('should reject invalid signature lengths', () => {
      expect(() => validateTransactionSignature('short')).toThrow(ValidationError);
      expect(() => validateTransactionSignature('a'.repeat(100))).toThrow(ValidationError);
    });

    it('should reject invalid base58 characters', () => {
      const invalidSignature = '0OIl' + 'a'.repeat(84); // Contains invalid base58 chars
      expect(() => validateTransactionSignature(invalidSignature)).toThrow(ValidationError);
    });
  });

  describe('validateRateLimit', () => {
    it('should allow calls within rate limit', () => {
      const now = Date.now();
      const timestamps = [now - 30000, now - 20000]; // 2 calls in last minute
      expect(() => validateRateLimit(timestamps, 5, 60000)).not.toThrow();
    });

    it('should reject calls exceeding rate limit', () => {
      const now = Date.now();
      const timestamps = Array(5).fill(now - 10000); // 5 recent calls
      expect(() => validateRateLimit(timestamps, 5, 60000)).toThrow(ValidationError);
    });

    it('should ignore expired timestamps', () => {
      const now = Date.now();
      const timestamps = [
        now - 70000, // Expired (older than 60s)
        now - 30000, // Valid
        now - 20000, // Valid
      ];
      expect(() => validateRateLimit(timestamps, 5, 60000)).not.toThrow();
    });
  });
});