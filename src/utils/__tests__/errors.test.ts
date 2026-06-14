import { describe, it, expect, vi } from 'vitest';
import {
  MarketplaceError,
  WalletConnectionError,
  TransactionError,
  ValidationError,
  NetworkError,
  RateLimitError,
  InsufficientBalanceError,
  classifyError,
  logError,
  formatErrorForUser,
  getErrorRecoveryActions,
} from '../errors';
import { ERROR_MESSAGES } from '../constants';

describe('error utilities', () => {
  describe('MarketplaceError', () => {
    it('should create error with correct properties', () => {
      const error = new MarketplaceError('Test message', 'TEST_CODE', 'testField', { extra: 'data' });
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.field).toBe('testField');
      expect(error.details).toEqual({ extra: 'data' });
      expect(error.name).toBe('MarketplaceError');
    });
  });

  describe('WalletConnectionError', () => {
    it('should create wallet error with default message', () => {
      const error = new WalletConnectionError();
      
      expect(error.message).toBe(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
      expect(error.code).toBe('WALLET_CONNECTION_ERROR');
      expect(error.name).toBe('WalletConnectionError');
    });

    it('should create wallet error with custom message', () => {
      const error = new WalletConnectionError('Custom wallet error');
      
      expect(error.message).toBe('Custom wallet error');
      expect(error.code).toBe('WALLET_CONNECTION_ERROR');
    });
  });

  describe('TransactionError', () => {
    it('should create transaction error with transaction ID', () => {
      const error = new TransactionError('Transaction failed', 'tx-123');
      
      expect(error.message).toBe('Transaction failed');
      expect(error.transactionId).toBe('tx-123');
      expect(error.code).toBe('TRANSACTION_ERROR');
      expect(error.name).toBe('TransactionError');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field', () => {
      const error = new ValidationError('Invalid input', 'email');
      
      expect(error.message).toBe('Invalid input');
      expect(error.field).toBe('email');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('InsufficientBalanceError', () => {
    it('should create balance error with amounts', () => {
      const error = new InsufficientBalanceError('Not enough balance', 10, 5);
      
      expect(error.message).toBe('Not enough balance');
      expect(error.required).toBe(10);
      expect(error.available).toBe(5);
      expect(error.details).toEqual({ required: 10, available: 5 });
    });
  });

  describe('classifyError', () => {
    it('should return MarketplaceError unchanged', () => {
      const originalError = new WalletConnectionError();
      const classified = classifyError(originalError);
      
      expect(classified).toBe(originalError);
    });

    it('should classify wallet connection errors', () => {
      const error = { code: 'WalletNotConnectedError', message: 'Wallet not connected' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(WalletConnectionError);
    });

    it('should classify transaction errors', () => {
      const error = { code: 'SendTransactionError', message: 'Failed to send' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(TransactionError);
      expect(classified.message).toBe('Failed to send');
    });

    it('should classify insufficient funds errors', () => {
      const error = { code: 'InsufficientFundsError', message: 'Not enough funds' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(InsufficientBalanceError);
    });

    it('should classify network errors', () => {
      const error = { name: 'NetworkError', message: 'Network failed' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(NetworkError);
      expect(classified.message).toBe('Network failed');
    });

    it('should classify timeout errors', () => {
      const error = { message: 'Request timeout occurred' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(NetworkError);
      expect(classified.message).toBe('Request timed out. Please try again.');
    });

    it('should classify validation errors', () => {
      const error = { name: 'ValidationError', message: 'Invalid data', field: 'price' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(ValidationError);
      expect(classified.field).toBe('price');
    });

    it('should create generic MarketplaceError for unknown errors', () => {
      const error = { message: 'Unknown error occurred' };
      const classified = classifyError(error);
      
      expect(classified).toBeInstanceOf(MarketplaceError);
      expect(classified.code).toBe('UNKNOWN_ERROR');
      expect(classified.message).toBe('Unknown error occurred');
    });

    it('should handle errors without messages', () => {
      const error = {};
      const classified = classifyError(error);
      
      expect(classified.message).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
      expect(classified.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('logError', () => {
    it('should log error in development mode', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new MarketplaceError('Test error', 'TEST_CODE');
      
      // Mock development environment
      vi.stubEnv('DEV', true);
      
      logError(error, 'test-context');
      
      expect(consoleSpy).toHaveBeenCalledWith('Marketplace Error:', expect.objectContaining({
        name: 'MarketplaceError',
        code: 'TEST_CODE',
        message: 'Test error',
        context: 'test-context',
        timestamp: expect.any(String),
      }));
      
      consoleSpy.mockRestore();
    });

    it('should not log in production mode', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new MarketplaceError('Test error', 'TEST_CODE');
      
      // Mock production environment
      vi.stubEnv('DEV', false);
      vi.stubEnv('PROD', true);
      
      logError(error, 'test-context');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('formatErrorForUser', () => {
    it('should format wallet connection errors', () => {
      const error = new WalletConnectionError();
      const formatted = formatErrorForUser(error);
      
      expect(formatted).toBe('Please connect your wallet and try again.');
    });

    it('should format transaction errors', () => {
      const error = new TransactionError();
      const formatted = formatErrorForUser(error);
      
      expect(formatted).toBe('Transaction failed. Please check your balance and try again.');
    });

    it('should format validation errors', () => {
      const error = new ValidationError('Price is too low', 'price');
      const formatted = formatErrorForUser(error);
      
      expect(formatted).toBe('Price is too low');
    });

    it('should format network errors', () => {
      const error = new NetworkError();
      const formatted = formatErrorForUser(error);
      
      expect(formatted).toBe('Network connection issue. Please check your internet and try again.');
    });

    it('should format rate limit errors', () => {
      const error = new RateLimitError();
      const formatted = formatErrorForUser(error);
      
      expect(formatted).toBe('You\'re making requests too quickly. Please wait a moment and try again.');
    });

    it('should format insufficient balance errors', () => {
      const error = new InsufficientBalanceError();
      const formatted = formatErrorForUser(error);
      
      expect(formatted).toBe('Insufficient balance to complete this transaction.');
    });

    it('should provide generic message for unknown errors', () => {
      const error = new MarketplaceError('Unknown', 'UNKNOWN_CODE');
      const formatted = formatErrorForUser(error);
      
      expect(formatted).toBe('Something went wrong. Please try again or contact support if the problem persists.');
    });
  });

  describe('getErrorRecoveryActions', () => {
    it('should provide wallet connection recovery actions', () => {
      const error = new WalletConnectionError();
      const actions = getErrorRecoveryActions(error);
      
      expect(actions).toContain('Connect your wallet');
      expect(actions).toContain('Refresh the page');
      expect(actions).toContain('Try a different wallet');
    });

    it('should provide transaction error recovery actions', () => {
      const error = new TransactionError();
      const actions = getErrorRecoveryActions(error);
      
      expect(actions).toContain('Check your SOL balance');
      expect(actions).toContain('Wait a moment and try again');
    });

    it('should provide network error recovery actions', () => {
      const error = new NetworkError();
      const actions = getErrorRecoveryActions(error);
      
      expect(actions).toContain('Check your internet connection');
      expect(actions).toContain('Try refreshing the page');
    });

    it('should provide rate limit recovery actions', () => {
      const error = new RateLimitError();
      const actions = getErrorRecoveryActions(error);
      
      expect(actions).toContain('Wait 1-2 minutes');
      expect(actions).toContain('Reduce request frequency');
    });

    it('should provide insufficient balance recovery actions', () => {
      const error = new InsufficientBalanceError();
      const actions = getErrorRecoveryActions(error);
      
      expect(actions).toContain('Add more SOL to your wallet');
      expect(actions).toContain('Choose a lower-priced NFT');
    });

    it('should provide default recovery actions for unknown errors', () => {
      const error = new MarketplaceError('Unknown', 'UNKNOWN_CODE');
      const actions = getErrorRecoveryActions(error);
      
      expect(actions).toContain('Try refreshing the page');
      expect(actions).toContain('Check your wallet connection');
      expect(actions).toContain('Contact support if issue persists');
    });
  });
});