import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MarketplaceProvider, useMarketplace } from '../MarketplaceContext';
import { setupMockEnv } from '../../test/mocks';

// Simple mocking
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    publicKey: { toBase58: () => 'mockkey' },
    connected: true,
  }),
  useConnection: () => ({
    connection: { commitment: 'confirmed' },
  }),
}));

vi.mock('../../hooks/useSolanaProgram', () => ({
  useSolanaProgram: () => ({ program: null }),
}));

// Simple test component
const TestComponent = () => {
  const { isLoading, error, listings } = useMarketplace();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="error">{error || 'no error'}</div>
      <div data-testid="listings">{listings.length}</div>
    </div>
  );
};

describe('MarketplaceContext Basic Integration', () => {
  beforeEach(() => {
    setupMockEnv();
    vi.clearAllMocks();
  });

  it('should initialize and render context state', async () => {
    render(
      <MarketplaceProvider>
        <TestComponent />
      </MarketplaceProvider>
    );
    
    // Initial state may be either loading or loaded since mocks are synchronous
    const loadingState = screen.getByTestId('loading').textContent;
    expect(['loading', 'loaded']).toContain(loadingState);
    
    // Should eventually finish loading
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });
    
    // Should have no error
    expect(screen.getByTestId('error')).toHaveTextContent('no error');
    
    // Should have empty listings initially
    expect(screen.getByTestId('listings')).toHaveTextContent('0');
  });
});