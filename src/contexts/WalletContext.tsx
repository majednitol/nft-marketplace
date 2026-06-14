import React, { ReactNode, useMemo, useCallback } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { toast } from 'react-hot-toast';

// Import wallet styles
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextProviderProps {
  children: ReactNode;
}

export function WalletContextProvider({ children }: WalletContextProviderProps) {
  // Get network from environment or default to devnet
  const network = useMemo(() => {
    const envNetwork = import.meta.env.VITE_SOLANA_NETWORK;
    console.log('Using Solana network:', envNetwork || 'devnet (default)');
    switch (envNetwork) {
      case 'mainnet-beta':
        return WalletAdapterNetwork.Mainnet;
      case 'testnet':
        return WalletAdapterNetwork.Testnet;
      case 'devnet':
      default:
        return WalletAdapterNetwork.Devnet;
    }
  }, []);

  // Get RPC endpoint from environment or use default
  const endpoint = useMemo(() => {
    const customEndpoint = import.meta.env.VITE_SOLANA_RPC_URL;
    const finalEndpoint = customEndpoint || clusterApiUrl(network);
    console.log('Using RPC endpoint:', finalEndpoint);
    return finalEndpoint;
  }, [network]);

  // Initialize wallets with error handling
  const wallets = useMemo(
    () => {
      try {
        return [
          new PhantomWalletAdapter(),
          new SolflareWalletAdapter(),
          new TorusWalletAdapter(),
          new LedgerWalletAdapter(),
        ];
      } catch (error) {
        console.error('Error initializing wallets:', error);
        return [];
      }
    },
    []
  );

  // Enhanced error handler
  const onError = useCallback((error: WalletError) => {
    console.error('Wallet error:', error);
    
    if (error.message?.includes('User rejected')) {
      toast.error('Wallet connection was cancelled');
    } else if (error.message?.includes('timeout')) {
      toast.error('Wallet connection timed out. Please try again.');
    } else if (error.message?.includes('not installed')) {
      toast.error('Wallet not installed. Please install the wallet extension.');
    } else {
      toast.error(`Wallet error: ${error.message || 'Unknown error'}`);
    }
  }, []);

  return (
    <ConnectionProvider 
      endpoint={endpoint}
      config={{
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      }}
    >
      <WalletProvider 
        wallets={wallets} 
        autoConnect={false}
        onError={onError}
        localStorageKey="walletName"
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}