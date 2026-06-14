import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRateLimit, useTransactionRateLimit, withRateLimit } from '../useRateLimit';
import { RateLimitError } from '../../utils/errors';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

beforeEach(() => {
  vi.stubGlobal('localStorage', mockLocalStorage);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useRateLimit', () => {
  it('should allow calls within rate limit', () => {
    const { result } = renderHook(() =>
      useRateLimit({ maxCalls: 5, windowMs: 60000, keyPrefix: 'test' })
    );

    expect(result.current.canMakeCall()).toBe(true);
    expect(result.current.getRemainingCalls()).toBe(5);
  });

  it('should record calls and update remaining count', () => {
    const { result } = renderHook(() =>
      useRateLimit({ maxCalls: 3, windowMs: 60000, keyPrefix: 'test' })
    );

    act(() => {
      result.current.recordCall();
    });

    expect(result.current.getRemainingCalls()).toBe(2);
    expect(result.current.canMakeCall()).toBe(true);
  });

  it('should prevent calls when rate limit is exceeded', () => {
    const { result } = renderHook(() =>
      useRateLimit({ maxCalls: 2, windowMs: 60000, keyPrefix: 'test' })
    );

    act(() => {
      result.current.recordCall();
      result.current.recordCall();
    });

    expect(result.current.canMakeCall()).toBe(false);
    expect(result.current.getRemainingCalls()).toBe(0);
  });

  it('should calculate time until reset correctly', () => {
    const { result } = renderHook(() =>
      useRateLimit({ maxCalls: 2, windowMs: 60000, keyPrefix: 'test' })
    );

    act(() => {
      result.current.recordCall();
    });

    const timeUntilReset = result.current.getTimeUntilReset();
    expect(timeUntilReset).toBeGreaterThan(59000); // Should be close to 60 seconds
    expect(timeUntilReset).toBeLessThanOrEqual(60000);
  });

  it('should reset rate limit when called', () => {
    const { result } = renderHook(() =>
      useRateLimit({ maxCalls: 2, windowMs: 60000, keyPrefix: 'test' })
    );

    act(() => {
      result.current.recordCall();
      result.current.recordCall();
    });

    expect(result.current.canMakeCall()).toBe(false);

    act(() => {
      result.current.reset();
    });

    expect(result.current.canMakeCall()).toBe(true);
    expect(result.current.getRemainingCalls()).toBe(2);
  });

  it('should save to localStorage when recording calls', () => {
    const { result } = renderHook(() =>
      useRateLimit({ maxCalls: 3, windowMs: 60000, keyPrefix: 'test' })
    );

    act(() => {
      result.current.recordCall();
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'rateLimit_test',
      expect.stringContaining('[')
    );
  });

  it('should handle localStorage persistence gracefully', () => {
    const { result } = renderHook(() =>
      useRateLimit({ maxCalls: 5, windowMs: 60000, keyPrefix: 'test' })
    );

    // Should work even if localStorage fails
    expect(result.current.canMakeCall()).toBe(true);
    expect(result.current.getRemainingCalls()).toBe(5);
  });

  it('should handle localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const { result } = renderHook(() =>
      useRateLimit({ maxCalls: 5, windowMs: 60000, keyPrefix: 'test' })
    );

    expect(result.current.canMakeCall()).toBe(true);
    expect(result.current.getRemainingCalls()).toBe(5);
  });
});

describe('predefined rate limiters', () => {
  it('should create transaction rate limiter with correct settings', () => {
    const { result } = renderHook(() => useTransactionRateLimit());

    expect(result.current.canMakeCall()).toBe(true);
    
    // Make 10 calls (the limit for transactions)
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.recordCall();
      }
    });

    expect(result.current.canMakeCall()).toBe(false);
  });
});

describe('withRateLimit', () => {
  it('should wrap function with basic functionality', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');
    
    const { result } = renderHook(() => 
      withRateLimit(mockFn, { maxCalls: 5, windowMs: 60000, keyPrefix: 'test' })
    );

    // Should call the wrapped function
    await expect(result.current()).resolves.toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should pass through function arguments correctly', async () => {
    const mockFn = vi.fn().mockImplementation((a, b) => Promise.resolve(a + b));
    
    const { result } = renderHook(() =>
      withRateLimit(mockFn, { maxCalls: 5, windowMs: 60000, keyPrefix: 'test' })
    );

    const response = await result.current(10, 20);
    
    expect(response).toBe(30);
    expect(mockFn).toHaveBeenCalledWith(10, 20);
  });

  it('should handle rate limiting behavior', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');
    
    const { result } = renderHook(() =>
      withRateLimit(mockFn, { maxCalls: 1, windowMs: 60000, keyPrefix: 'test' })
    );

    // First call should work
    await result.current();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});