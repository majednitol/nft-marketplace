import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, AccountInfo } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { queryKeys, invalidateQueries } from '../lib/queryClient';
import { toast } from 'react-hot-toast';
import { useSolanaProgram } from './useSolanaProgram';

export interface RealTimeEvent {
  type: 'nft_listed' | 'nft_sold' | 'nft_delisted' | 'marketplace_updated' | 'account_changed';
  data: any;
  timestamp: number;
  signature?: string;
  account?: string;
}

interface UseRealTimeUpdatesOptions {
  enableNotifications?: boolean;
  enableAccountListeners?: boolean;
  enableProgramListeners?: boolean;
}

export const useRealTimeUpdates = (options: UseRealTimeUpdatesOptions = {}) => {
  const {
    enableNotifications = true,
    enableAccountListeners = true,
    enableProgramListeners = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastEvent, setLastEvent] = useState<RealTimeEvent | null>(null);
  
  const { connection } = useConnection();
  const { program, getMarketplacePDA, fetchAllListings } = useSolanaProgram();
  const subscriptionIds = useRef<number[]>([]);
  const queryClient = useQueryClient();

  // Handle real-time events
  const handleRealTimeEvent = useCallback((event: RealTimeEvent) => {
    setLastEvent(event);
    
    // Show notifications for important events
    if (enableNotifications) {
      switch (event.type) {
        case 'nft_listed':
          toast.success(`New NFT listed: ${event.data.name || 'Unknown'}`);
          break;
        case 'nft_sold':
          toast.success(`NFT sold for ${event.data.price} SOL`);
          break;
        case 'nft_delisted':
          toast.info(`NFT delisted: ${event.data.name || 'Unknown'}`);
          break;
      }
    }

    // Invalidate relevant queries based on event type
    switch (event.type) {
      case 'nft_listed':
      case 'nft_sold':
      case 'nft_delisted':
        invalidateQueries.listings();
        invalidateQueries.marketplace();
        break;
      case 'marketplace_updated':
        invalidateQueries.marketplace();
        break;
    }
  }, [enableNotifications, queryClient]);

  // Set up Solana account change listeners
  const setupAccountListeners = useCallback(async () => {
    if (!connection || !program || !enableAccountListeners) {
      return;
    }

    try {
      console.log('Setting up Solana account change listeners...');
      setConnectionState('connecting');

      // Listen to marketplace account changes
      const [marketplacePDA] = getMarketplacePDA();
      const marketplaceSubscriptionId = connection.onAccountChange(
        marketplacePDA,
        (accountInfo: AccountInfo<Buffer>, context) => {
          console.log('Marketplace account changed:', context);
          
          const event: RealTimeEvent = {
            type: 'marketplace_updated',
            data: {
              account: marketplacePDA.toBase58(),
              lamports: accountInfo.lamports,
              slot: context.slot,
            },
            timestamp: Date.now(),
            account: marketplacePDA.toBase58(),
          };
          
          handleRealTimeEvent(event);
        },
        'confirmed'
      );
      
      subscriptionIds.current.push(marketplaceSubscriptionId);

      // Listen to all listing account changes
      // Note: This is a simplified approach - in production, you might want to
      // listen to specific accounts or use program logs
      if (program.account?.listing && fetchAllListings) {
        console.log('Setting up program account listeners...');
        
        // Get all current listings to set up individual listeners
        try {
          const listings = await fetchAllListings();
          
          listings.forEach((listing) => {
            const listingSubscriptionId = connection.onAccountChange(
              listing.publicKey,
              (accountInfo: AccountInfo<Buffer>, context) => {
                console.log('Listing account changed:', listing.publicKey.toBase58());
                
                // If account data is null, it was closed (delisted)
                if (accountInfo.data.length === 0) {
                  const event: RealTimeEvent = {
                    type: 'nft_delisted',
                    data: {
                      listingId: listing.publicKey.toBase58(),
                      nftMint: listing.nftMint.toBase58(),
                      slot: context.slot,
                    },
                    timestamp: Date.now(),
                    account: listing.publicKey.toBase58(),
                  };
                  
                  handleRealTimeEvent(event);
                } else {
                  // Account was updated
                  const event: RealTimeEvent = {
                    type: 'account_changed',
                    data: {
                      listingId: listing.publicKey.toBase58(),
                      nftMint: listing.nftMint.toBase58(),
                      slot: context.slot,
                    },
                    timestamp: Date.now(),
                    account: listing.publicKey.toBase58(),
                  };
                  
                  handleRealTimeEvent(event);
                }
              },
              'confirmed'
            );
            
            subscriptionIds.current.push(listingSubscriptionId);
          });
        } catch (error) {
          console.warn('Could not set up listing listeners:', error);
        }
      }

      setIsConnected(true);
      setConnectionState('connected');
      console.log(`Set up ${subscriptionIds.current.length} account listeners`);

    } catch (error) {
      console.error('Error setting up Solana listeners:', error);
      setConnectionState('error');
      setIsConnected(false);
    }
  }, [connection, program, enableAccountListeners, getMarketplacePDA, handleRealTimeEvent]);

  // Set up program event listeners (if supported by the program)
  const setupProgramListeners = useCallback(async () => {
    if (!program || !enableProgramListeners) {
      return;
    }

    try {
      // Listen to program logs for transaction events
      // This would require the program to emit specific events
      console.log('Program event listeners not yet implemented');
      
      // Example of how you might listen to program events:
      // const eventParser = new EventParser(program.programId, program.coder);
      // program.addEventListener('nftListed', (event, slot) => {
      //   const realTimeEvent: RealTimeEvent = {
      //     type: 'nft_listed',
      //     data: event,
      //     timestamp: Date.now(),
      //   };
      //   handleRealTimeEvent(realTimeEvent);
      // });
      
    } catch (error) {
      console.error('Error setting up program listeners:', error);
    }
  }, [program, enableProgramListeners, handleRealTimeEvent]);

  // Clean up listeners
  const cleanup = useCallback(() => {
    console.log('Cleaning up real-time listeners...');
    
    // Remove all account subscriptions
    subscriptionIds.current.forEach(id => {
      try {
        connection?.removeAccountChangeListener(id);
      } catch (error) {
        console.warn('Error removing account listener:', error);
      }
    });
    
    subscriptionIds.current = [];
    setIsConnected(false);
    setConnectionState('disconnected');
  }, [connection]);

  // Set up listeners when connection and program are ready
  useEffect(() => {
    if (connection && program) {
      setupAccountListeners();
      setupProgramListeners();
    }

    return cleanup;
  }, [connection, program, setupAccountListeners, setupProgramListeners, cleanup]);

  // Manual refresh function
  const refresh = useCallback(() => {
    console.log('Manually refreshing real-time connections...');
    cleanup();
    if (connection && program) {
      setupAccountListeners();
      setupProgramListeners();
    }
  }, [connection, program, cleanup, setupAccountListeners, setupProgramListeners]);

  // Function to simulate events for testing
  const simulateEvent = useCallback((event: Omit<RealTimeEvent, 'timestamp'>) => {
    const fullEvent: RealTimeEvent = {
      ...event,
      timestamp: Date.now(),
    };
    handleRealTimeEvent(fullEvent);
  }, [handleRealTimeEvent]);

  return {
    isConnected,
    connectionState,
    lastEvent,
    activeSubscriptions: subscriptionIds.current.length,
    refresh,
    simulateEvent, // For testing purposes
    cleanup,
  };
};

// Hook for listening to specific account changes
export const useAccountListener = (
  accountPublicKey: PublicKey | null,
  callback: (accountInfo: AccountInfo<Buffer>) => void
) => {
  const { connection } = useConnection();
  const subscriptionId = useRef<number | null>(null);

  useEffect(() => {
    if (!connection || !accountPublicKey) {
      return;
    }

    console.log(`Setting up listener for account: ${accountPublicKey.toBase58()}`);
    
    subscriptionId.current = connection.onAccountChange(
      accountPublicKey,
      callback,
      'confirmed'
    );

    return () => {
      if (subscriptionId.current !== null) {
        connection.removeAccountChangeListener(subscriptionId.current);
        subscriptionId.current = null;
      }
    };
  }, [connection, accountPublicKey, callback]);

  return {
    isListening: subscriptionId.current !== null,
  };
};

// Hook for listening to program account changes
export const useProgramAccountsListener = (
  program: Program | null,
  accountType: string,
  callback: (accounts: any[]) => void
) => {
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!program || !program.account?.[accountType]) {
      return;
    }

    // Since Solana doesn't have a direct way to listen to all accounts of a type,
    // we poll periodically for changes
    const pollAccounts = async () => {
      try {
        const accounts = await program.account[accountType].all();
        callback(accounts);
      } catch (error) {
        console.error(`Error polling ${accountType} accounts:`, error);
      }
    };

    // Initial fetch
    pollAccounts();

    // Set up polling interval (every 30 seconds)
    intervalId.current = setInterval(pollAccounts, 30000);

    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
    };
  }, [program, accountType, callback]);

  return {
    isPolling: intervalId.current !== null,
  };
};