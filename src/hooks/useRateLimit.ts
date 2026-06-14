import { useState, useCallback, useRef } from 'react';
import { RATE_LIMITS } from '../utils/constants';
import { RateLimitError } from '../utils/errors';

interface RateLimitConfig {
  maxCalls: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitState {
  canMakeCall: () => boolean;
  recordCall: () => void;
  getRemainingCalls: () => number;
  getTimeUntilReset: () => number;
  reset: () => void;
}

/**
 * Hook for client-side rate limiting
 * Prevents users from making too many requests in a short time period
 */
export const useRateLimit = (config: RateLimitConfig): RateLimitState => {
  const {
    maxCalls,
    windowMs,
    keyPrefix = 'default'
  } = config;

  const [callTimestamps, setCallTimestamps] = useState<number[]>([]);
  const storageKey = `rateLimit_${keyPrefix}`;

  // Load from localStorage on first render
  const loadFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const timestamps = JSON.parse(stored) as number[];
        const now = Date.now();
        // Filter out expired timestamps
        const validTimestamps = timestamps.filter(timestamp => now - timestamp < windowMs);
        setCallTimestamps(validTimestamps);
        return validTimestamps;
      }
    } catch (error) {
      console.warn('Failed to load rate limit data from storage:', error);
    }
    return [];
  }, [storageKey, windowMs]);

  // Save to localStorage
  const saveToStorage = useCallback((timestamps: number[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(timestamps));
    } catch (error) {
      console.warn('Failed to save rate limit data to storage:', error);
    }
  }, [storageKey]);

  // Check if a call can be made
  const canMakeCall = useCallback((): boolean => {
    const now = Date.now();
    const currentTimestamps = callTimestamps.length === 0 ? loadFromStorage() : callTimestamps;
    const validTimestamps = currentTimestamps.filter(timestamp => now - timestamp < windowMs);
    
    return validTimestamps.length < maxCalls;
  }, [callTimestamps, loadFromStorage, maxCalls, windowMs]);

  // Record a new call
  const recordCall = useCallback(() => {
    const now = Date.now();
    
    setCallTimestamps(prevTimestamps => {
      // Filter out expired timestamps and add new one
      const validTimestamps = prevTimestamps.filter(timestamp => now - timestamp < windowMs);
      const newTimestamps = [...validTimestamps, now];
      
      // Save to storage
      saveToStorage(newTimestamps);
      
      return newTimestamps;
    });
  }, [windowMs, saveToStorage]);

  // Get remaining calls in current window
  const getRemainingCalls = useCallback((): number => {
    const now = Date.now();
    const validTimestamps = callTimestamps.filter(timestamp => now - timestamp < windowMs);
    return Math.max(0, maxCalls - validTimestamps.length);
  }, [callTimestamps, maxCalls, windowMs]);

  // Get time until rate limit resets
  const getTimeUntilReset = useCallback((): number => {
    if (callTimestamps.length === 0) return 0;
    
    const now = Date.now();
    const oldestCall = Math.min(...callTimestamps);
    const resetTime = oldestCall + windowMs;
    
    return Math.max(0, resetTime - now);
  }, [callTimestamps, windowMs]);

  // Reset rate limit (for testing or manual reset)
  const reset = useCallback(() => {
    setCallTimestamps([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    canMakeCall,
    recordCall,
    getRemainingCalls,
    getTimeUntilReset,
    reset,
  };
};

/**
 * Predefined rate limiters for common operations
 */
export const useTransactionRateLimit = (maxCalls: number = 10, windowMs: number = 60000) => {
  return useRateLimit({
    maxCalls,
    windowMs,
    keyPrefix: 'transactions',
  });
};

export const useQueryRateLimit = () => {
  return useRateLimit({
    maxCalls: RATE_LIMITS.QUERIES_PER_MINUTE,
    windowMs: RATE_LIMITS.WINDOW_MS,
    keyPrefix: 'queries',
  });
};

export const useWalletConnectionRateLimit = () => {
  return useRateLimit({
    maxCalls: RATE_LIMITS.WALLET_CONNECTIONS_PER_MINUTE,
    windowMs: RATE_LIMITS.WINDOW_MS,
    keyPrefix: 'wallet_connections',
  });
};

/**
 * Higher-order function to wrap async functions with rate limiting
 */
export const withRateLimit = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  rateLimitConfig: RateLimitConfig
): T => {
  const rateLimit = useRateLimit(rateLimitConfig);

  return (async (...args: Parameters<T>) => {
    if (!rateLimit.canMakeCall()) {
      const timeUntilReset = rateLimit.getTimeUntilReset();
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${Math.ceil(timeUntilReset / 1000)} seconds.`,
        { timeUntilReset, remainingCalls: rateLimit.getRemainingCalls() }
      );
    }

    rateLimit.recordCall();
    return fn(...args);
  }) as T;
};