import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEVMProgram } from '../hooks/useEVMProgram';
import { ethers } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'react-hot-toast';
import { Marketplace, NFTListing, MarketplaceStats, UserPortfolio } from '../types/marketplace';
import { useSolanaProgram, MarketplaceAccount, ListingAccount } from '../hooks/useSolanaProgram';
import { useTransactionRateLimit } from '../hooks/useRateLimit';
import { 
  validateNFTPrice, 
  validatePublicKey, 
  validateMarketplaceFee, 
  validateMarketplaceName,
  ValidationError 
} from '../utils/validation';
import { 
  classifyError, 
  logError, 
  formatErrorForUser,
  MarketplaceError,
  TransactionError,
  WalletConnectionError 
} from '../utils/errors';
import { TRANSACTION_SAFETY, SUCCESS_MESSAGES } from '../utils/constants';
import { getCompleteNFTMetadata, batchFetchNFTMetadata } from '../utils/metaplex';
import { fetchUserNFTs, userNFTToListing, calculatePortfolioValue } from '../utils/userNFTs';
import { fetchWalletNFTsStandalone } from '../utils/standaloneNFTFetcher';
const emptyStats: MarketplaceStats = {
  totalListings: 0,
  totalSales: 0,
  totalVolume: 0,
  averagePrice: 0,
  uniqueOwners: 0,
  floorPrice: 0,
};

const emptyUserPortfolio: UserPortfolio = {
  ownedNFTs: [],
  listedNFTs: [],
  totalValue: 0,
  totalListings: 0,
};

import { debugConnectionState, debugError } from '../utils/debug';

interface MarketplaceState {
  marketplace: Marketplace | null;
  listings: NFTListing[];
  stats: MarketplaceStats | null;
  userPortfolio: UserPortfolio | null;
  userPurchases: any[];
  loading: boolean;
  error: string | null;
}

type MarketplaceAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MARKETPLACE'; payload: Marketplace }
  | { type: 'SET_MARKETPLACE_RATE_LIMIT'; payload: number }
  | { type: 'SET_LISTINGS'; payload: NFTListing[] }
  | { type: 'SET_STATS'; payload: MarketplaceStats }
  | { type: 'SET_USER_PORTFOLIO'; payload: UserPortfolio }
  | { type: 'SET_USER_PURCHASES'; payload: any[] }
  | { type: 'ADD_LISTING'; payload: NFTListing }
  | { type: 'REMOVE_LISTING'; payload: string }
  | { type: 'UPDATE_LISTING'; payload: NFTListing };

const initialState: MarketplaceState = {
  marketplace: null,
  listings: [],
  stats: null,
  userPortfolio: null,
  userPurchases: [],
  loading: false,
  error: null,
};

function marketplaceReducer(state: MarketplaceState, action: MarketplaceAction): MarketplaceState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_MARKETPLACE':
      return { 
        ...state, 
        marketplace: {
          ...action.payload,
          rateLimit: action.payload.rateLimit !== undefined 
            ? action.payload.rateLimit 
            : (state.marketplace?.rateLimit ?? 100)
        } 
      };
    case 'SET_MARKETPLACE_RATE_LIMIT':
      return { 
        ...state, 
        marketplace: state.marketplace 
          ? { ...state.marketplace, rateLimit: action.payload } 
          : null 
      };
    case 'SET_LISTINGS':
      return { ...state, listings: action.payload };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    case 'SET_USER_PORTFOLIO':
      return { ...state, userPortfolio: action.payload };
    case 'SET_USER_PURCHASES':
      return { ...state, userPurchases: action.payload };
    case 'ADD_LISTING':
      if (state.listings.some(listing => listing.id === action.payload.id)) {
        return state;
      }
      return { ...state, listings: [action.payload, ...state.listings] };
    case 'REMOVE_LISTING':
      return { 
        ...state, 
        listings: state.listings.filter(listing => listing.id !== action.payload) 
      };
    case 'UPDATE_LISTING':
      return {
        ...state,
        listings: state.listings.map(listing =>
          listing.id === action.payload.id ? action.payload : listing
        ),
      };
    default:
      return state;
  }
}


interface MarketplaceContextType extends MarketplaceState {
  activeChain: 'solana' | 'evm';
  setActiveChain: (chain: 'solana' | 'evm') => void;
  evmWalletAddress: string | null;
  evmConnected: boolean;
  connectEVMWallet: () => Promise<string | null>;
  disconnectEVMWallet: () => void;
  mintEVMNFT: (tokenUri: string) => Promise<string>;
  initializeMarketplace: (name: string, fee: number) => Promise<void>;
  listNFT: (nftMint: string, price: number) => Promise<void>;
  purchaseNFT: (listingId: string) => Promise<void>;
  delistNFT: (listingId: string) => Promise<void>;
  updateFee: (newFee: number) => Promise<void>;
  updateRateLimit: (newLimit: number) => Promise<void>;
  refreshData: () => Promise<void>;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

function getWebSocketUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (!apiUrl || apiUrl.startsWith('/')) {
    const loc = window.location;
    const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = loc.host; // includes port
    return `${proto}//${host}/api/ws`;
  }
  let wsUrl = apiUrl.replace(/^http/, 'ws');
  wsUrl = wsUrl.replace(/\/api$/, '');
  return `${wsUrl}/api/ws`;
}

function parseListingEvent(eventData: any, chain: 'solana' | 'evm'): NFTListing {
  const isEvm = chain === 'evm';
  const priceDivider = isEvm ? 1e18 : 1e9;
  const rawPrice = parseFloat(eventData.price) || 0;
  
  return {
    id: eventData.address,
    marketplace: eventData.marketplaceAddress,
    nftMint: eventData.nftMint,
    seller: eventData.maker,
    price: rawPrice / priceDivider,
    createdAt: new Date(eventData.createdAt).getTime(),
    metadata: {
      name: eventData.nft?.name || `NFT ${eventData.nftMint.slice(0, 8)}`,
      description: eventData.nft?.description || 'NFT details',
      image: eventData.nft?.imageUrl || eventData.nft?.image || '',
      animationUrl: eventData.nft?.animationUrl || eventData.nft?.animation_url || '',
      animation_url: eventData.nft?.animationUrl || eventData.nft?.animation_url || '',
      attributes: eventData.nft?.attributes || []
    }
  };
}

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(marketplaceReducer, initialState);
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [activeChain, setActiveChain] = useState<'solana' | 'evm'>('solana');
  const evmProgram = useEVMProgram();

  const activeChainRef = React.useRef(activeChain);
  useEffect(() => {
    activeChainRef.current = activeChain;
    
    // Immediately clear state on active chain switch to prevent layout leaks
    dispatch({ type: 'SET_LISTINGS', payload: [] });
    dispatch({ type: 'SET_STATS', payload: emptyStats });
    dispatch({ type: 'SET_USER_PORTFOLIO', payload: emptyUserPortfolio });
    dispatch({ type: 'SET_USER_PURCHASES', payload: [] });
  }, [activeChain]);
  
  // Rate limiting for transactions (default to 100 tx/hour)
  const transactionRateLimit = useTransactionRateLimit(
    state.marketplace?.rateLimit || 100,
    3600000 // 1 hour window
  );
  
  // Use useSolanaProgram hook safely
  const solanaProgram = useSolanaProgram();
  
  const {
    program,
    initializeMarketplace: initMarketplace,
    listNft,
    purchaseNft,
    delistNft,
    updateMarketplaceFee,
    fetchMarketplace,
    fetchAllListings,
    fetchListing,
    lamportsToSol,
    solToLamports,
    getMarketplacePDA
  } = solanaProgram;

  // Helper function to convert blockchain data to frontend types with real metadata
  const convertListingToNFTListing = async (
    listingAccount: ListingAccount, 
    publicKey: string,
    metadataMap?: Map<string, { onChain: any; json: any }>
  ): Promise<NFTListing> => {
    const mintString = listingAccount.nftMint.toBase58();
    
    // Try to get metadata from cache first
    let metadata = metadataMap?.get(mintString);
    
    // If not in cache, fetch it
    if (!metadata) {
      try {
        metadata = await getCompleteNFTMetadata(connection, listingAccount.nftMint);
      } catch (error) {
        console.warn(`Failed to fetch metadata for ${mintString}:`, error);
      }
    }

    return {
      id: publicKey,
      marketplace: 'marketplace-1',
      nftMint: mintString,
      seller: listingAccount.maker.toBase58(),
      price: lamportsToSol(listingAccount.price),
      createdAt: Date.now(), // TODO: Get actual creation timestamp from events
      metadata: metadata?.json || {
        name: `NFT ${publicKey.slice(0, 8)}`,
        description: 'NFT metadata unavailable',
        image: '', // No fallback image for now
        attributes: []
      }
    };
  };

  // Secure transaction wrapper
  const executeTransaction = async <T,>(
    operation: () => Promise<T>,
    operationName: string,
    successMessage: string
  ): Promise<T | null> => {
    // Check wallet connection
    if (activeChain === 'evm') {
      if (!evmProgram.walletAddress) {
        const error = new WalletConnectionError("Please connect your MetaMask wallet");
        logError(error, operationName);
        toast.error(formatErrorForUser(error));
        throw error;
      }
    } else {
      if (!publicKey) {
        const error = new WalletConnectionError();
        logError(error, operationName);
        toast.error(formatErrorForUser(error));
        throw error;
      }
    }

    // Check rate limit
    if (!transactionRateLimit.canMakeCall()) {
      const timeUntilReset = transactionRateLimit.getTimeUntilReset();
      const error = new MarketplaceError(
        `Too many transactions. Please wait ${Math.ceil(timeUntilReset / 1000)} seconds.`,
        'RATE_LIMIT_ERROR'
      );
      logError(error, operationName);
      toast.error(formatErrorForUser(error));
      throw error;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Record the transaction attempt
      transactionRateLimit.recordCall();

      // Execute with timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Transaction timeout')), TRANSACTION_SAFETY.TIMEOUT_MS)
      );

      const result = await Promise.race([operation(), timeoutPromise]);

      // Success
      toast.success(successMessage);
      await refreshData();
      return result;

    } catch (error: any) {
      const marketplaceError = classifyError(error);
      logError(marketplaceError, operationName);
      
      const userMessage = formatErrorForUser(marketplaceError);
      dispatch({ type: 'SET_ERROR', payload: userMessage });
      toast.error(userMessage);
      
      throw marketplaceError;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const initializeMarketplace = async (name: string, fee: number) => {
    try {
      // Validate inputs
      validateMarketplaceName(name);
      validateMarketplaceFee(fee);

      if (activeChain === 'evm') {
        toast.success('EVM Marketplace is pre-initialized via Solidity deployment!');
        return;
      }

      if (!initMarketplace) {
        console.error('❌ Marketplace initialization function not available');
        console.error('Program status:', { program, initMarketplace });
        toast.error('Program not initialized. Please refresh the page and ensure your wallet is connected.');
        throw new Error('Marketplace initialization function not available - program not ready');
      }

      console.log('🚀 Starting marketplace initialization...', { name, fee });

      await executeTransaction(
        () => initMarketplace(name, fee),
        'initializeMarketplace',
        SUCCESS_MESSAGES.MARKETPLACE_INITIALIZED
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        toast.error(error.message);
        logError(error, 'initializeMarketplace');
      }
      // Other errors are handled by executeTransaction
    }
  };

  const listNFT = async (nftMint: string, price: number) => {
    try {
      if (activeChain === 'evm') {
        await executeTransaction(
          async () => {
            return await evmProgram.listNFT(nftMint, price);
          },
          'listNFT',
          'NFT listed successfully on Ethereum Sepolia!'
        );
        return;
      }

      // Validate inputs
      validatePublicKey(nftMint);
      validateNFTPrice(price);

      if (!listNft) {
        throw new Error('NFT listing function not available');
      }

      await executeTransaction(
        async () => {
          const nftMintPubkey = new PublicKey(nftMint);
          const priceInLamports = solToLamports(price);
          return await listNft(nftMintPubkey, priceInLamports);
        },
        'listNFT',
        SUCCESS_MESSAGES.NFT_LISTED
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        toast.error(error.message);
        logError(error, 'listNFT');
      }
      // Other errors are handled by executeTransaction
    }
  };

  const purchaseNFT = async (listingId: string) => {
    try {
      // Find the listing to get mint and seller info
      const listing = state.listings.find(l => l.id === listingId);
      if (!listing) {
        throw new ValidationError('Listing not found', 'listingId');
      }

      if (activeChain === 'evm') {
        await executeTransaction(
          async () => {
            return await evmProgram.purchaseNFT(listing.nftMint, listing.price);
          },
          'purchaseNFT',
          'NFT purchased successfully on Ethereum Sepolia!'
        );
        return;
      }

      if (!purchaseNft) {
        throw new Error('NFT purchase function not available');
      }

      await executeTransaction(
        async () => {
          const nftMintPubkey = new PublicKey(listing.nftMint);
          const sellerPubkey = new PublicKey(listing.seller);
          return await purchaseNft(nftMintPubkey, sellerPubkey);
        },
        'purchaseNFT',
        'NFT purchased successfully!'
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        toast.error(error.message);
        logError(error, 'purchaseNFT');
      }
      // Other errors are handled by executeTransaction
    }
  };

  const delistNFT = async (listingId: string) => {
    try {
      // Find the listing to get mint info
      const listing = state.listings.find(l => l.id === listingId);
      if (!listing) {
        throw new ValidationError('Listing not found', 'listingId');
      }

      if (activeChain === 'evm') {
        await executeTransaction(
          async () => {
            return await evmProgram.delistNFT(listing.nftMint);
          },
          'delistNFT',
          'NFT delisted successfully on Ethereum Sepolia!'
        );
        return;
      }

      if (!delistNft) {
        throw new Error('NFT delisting function not available');
      }

      await executeTransaction(
        async () => {
          const nftMintPubkey = new PublicKey(listing.nftMint);
          return await delistNft(nftMintPubkey);
        },
        'delistNFT',
        'NFT delisted successfully!'
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        toast.error(error.message);
        logError(error, 'delistNFT');
      }
      // Other errors are handled by executeTransaction
    }
  };

  const updateFee = async (newFee: number) => {
    try {
      validateMarketplaceFee(newFee);

      if (activeChain === 'evm') {
        await executeTransaction(
          async () => {
            const feeBps = Math.round(newFee * 100);
            return await evmProgram.updateFee(feeBps);
          },
          'updateFee',
          'Marketplace fee updated successfully on Ethereum Sepolia!'
        );
        return;
      }

      if (!updateMarketplaceFee) {
        throw new Error('Update marketplace fee function not available');
      }

      await executeTransaction(
        async () => {
          return await updateMarketplaceFee(newFee);
        },
        'updateFee',
        'Marketplace fee updated successfully!'
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        toast.error(error.message);
        logError(error, 'updateFee');
      }
      // Other errors are handled by executeTransaction
    }
  };

  const updateRateLimit = async (newLimit: number) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const [marketplacePDA] = getMarketplacePDA();
    const mAddress = marketplacePDA.toBase58();

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch(`${apiUrl}/admin/${mAddress}/rate-limit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rateLimit: newLimit }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update rate limit');
      }

      dispatch({ type: 'SET_MARKETPLACE_RATE_LIMIT', payload: newLimit });
      toast.success('Rate limit updated successfully!');
      
      // Refresh backend statistics to sync
      await refreshData();
    } catch (error: any) {
      console.error('Error updating rate limit:', error);
      const errorMessage = error.message || 'Failed to update rate limit';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const refreshData = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const fetchChain = activeChain;

    if (activeChain === 'evm') {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const evmMarketplaceAddress = import.meta.env.VITE_EVM_MARKETPLACE_ADDRESS;
        const evmNftAddress = import.meta.env.VITE_EVM_NFT_ADDRESS;
        if (!evmMarketplaceAddress) {
          throw new Error('EVM Marketplace Address not configured');
        }

        const evmMarketplace: Marketplace = {
          id: evmMarketplaceAddress.toLowerCase(),
          name: 'Nexus EVM Marketplace',
          authority: '',
          fee: 2.5,
          treasury: '',
          totalListings: 0,
          totalSales: 0,
          totalVolume: 0,
          createdAt: new Date().toISOString()
        };

        const listingsResponse = await fetch(`${apiUrl}/listings?marketplace=${evmMarketplaceAddress.toLowerCase()}&chain=evm`);
        let evmListings: NFTListing[] = [];
        if (listingsResponse.ok) {
          const data = await listingsResponse.json();
          evmListings = data.map((item: any) => ({
            id: item.address,
            marketplace: item.marketplaceAddress,
            nftMint: item.nftMint,
            seller: item.maker,
            price: parseFloat(item.price) / 1e18, // Convert Wei to ETH
            createdAt: new Date(item.createdAt).getTime(),
            metadata: item.nft || {
              name: `NFT ${item.nftMint.slice(0, 8)}`,
              description: 'EVM NFT',
              image: '',
              attributes: []
            }
          }));
        }
        if (activeChainRef.current !== fetchChain) return;
        dispatch({ type: 'SET_LISTINGS', payload: evmListings });

        try {
          const statsResponse = await fetch(`${apiUrl}/stats/${evmMarketplaceAddress.toLowerCase()}`);
          if (statsResponse.ok) {
            const backendStats = await statsResponse.json();
            const stats: MarketplaceStats = {
              totalListings: backendStats.activeListingsCount,
              totalSales: backendStats.salesCount,
              totalVolume: parseFloat(backendStats.totalVolume) / 1e18,
              averagePrice: backendStats.salesCount > 0 ? (parseFloat(backendStats.totalVolume) / 1e18) / backendStats.salesCount : 0,
              uniqueOwners: new Set(evmListings.map(l => l.seller)).size,
              floorPrice: parseFloat(backendStats.floorPrice) / 1e18
            };
            if (activeChainRef.current !== fetchChain) return;
            dispatch({ type: 'SET_STATS', payload: stats });
            if (backendStats.rateLimit !== undefined) {
              dispatch({ type: 'SET_MARKETPLACE_RATE_LIMIT', payload: backendStats.rateLimit });
            }
          }
        } catch (err) {
          console.warn('Failed to fetch EVM stats from backend:', err);
        }

        let userPortfolio: UserPortfolio = emptyUserPortfolio;
        if (evmProgram.walletAddress) {
          const userListings = evmListings.filter(l => l.seller.toLowerCase() === evmProgram.walletAddress!.toLowerCase());
          
          let ownedNFTs: NFTListing[] = [];
          try {
            if (typeof window !== 'undefined' && (window as any).ethereum && evmNftAddress) {
              const provider = new ethers.BrowserProvider((window as any).ethereum);
              const nftContract = new ethers.Contract(
                evmNftAddress, 
                ["function ownerOf(uint256) view returns (address)"], 
                provider
              );
              
              let tokenId = 1;
              const maxEmptyAttempts = 3;
              let emptyAttempts = 0;
              
              while (emptyAttempts < maxEmptyAttempts) {
                try {
                  const owner = await nftContract.ownerOf(tokenId);
                  if (owner.toLowerCase() === evmProgram.walletAddress.toLowerCase()) {
                    const response = await fetch(`${apiUrl}/nfts/metadata/${evmNftAddress.toLowerCase()}-${tokenId}`);
                    let metadata: any = { name: `Nexus NFT #${tokenId}`, description: 'Mock ERC721 NFT', image: '' };
                    if (response.ok) {
                      metadata = await response.json();
                    }
                    ownedNFTs.push({
                      id: `${evmNftAddress.toLowerCase()}-${tokenId}`,
                      marketplace: evmMarketplaceAddress.toLowerCase(),
                      nftMint: `${evmNftAddress.toLowerCase()}-${tokenId}`,
                      seller: evmProgram.walletAddress,
                      price: 0,
                      createdAt: Date.now(),
                      metadata: {
                        name: metadata.name,
                        description: metadata.description || 'Mock ERC721 NFT',
                        image: metadata.image || '',
                        animationUrl: metadata.animation_url || metadata.animationUrl || '',
                        animation_url: metadata.animation_url || metadata.animationUrl || '',
                        attributes: metadata.attributes || []
                      }
                    });
                  }
                  emptyAttempts = 0;
                } catch (e) {
                  emptyAttempts++;
                }
                tokenId++;
              }
            }
          } catch (nftErr) {
            console.warn('Failed to fetch EVM owned NFTs:', nftErr);
          }

          const totalValue = userListings.reduce((sum, listing) => sum + listing.price, 0);
          userPortfolio = {
            ownedNFTs,
            listedNFTs: userListings,
            totalValue,
            totalListings: userListings.length
          };

          try {
            const purchasesResponse = await fetch(`${apiUrl}/users/${evmProgram.walletAddress.toLowerCase()}/purchases`);
            if (purchasesResponse.ok) {
              const backendPurchases = await purchasesResponse.json();
              if (activeChainRef.current !== fetchChain) return;
              dispatch({ type: 'SET_USER_PURCHASES', payload: backendPurchases });
            }
          } catch (purchasesErr) {
            console.warn('Failed to fetch EVM purchases:', purchasesErr);
          }
        }
        if (activeChainRef.current !== fetchChain) return;
        dispatch({ type: 'SET_USER_PORTFOLIO', payload: userPortfolio });
        dispatch({ type: 'SET_MARKETPLACE', payload: evmMarketplace });
      } catch (error: any) {
        console.error('Error refreshing EVM data:', error);
        if (activeChainRef.current !== fetchChain) return;
        dispatch({ type: 'SET_ERROR', payload: `EVM Error: ${error.message}` });
      } finally {
        if (activeChainRef.current === fetchChain) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
      return;
    }

    // Check if we have program functions available
    const hasProgramFunctions = fetchMarketplace && fetchAllListings && program;

    // If program functions are not available, use standalone NFT fetching
    if (!hasProgramFunctions) {
      if (!publicKey) {
        console.warn('Wallet not connected and program not ready, skipping data refresh');
        return;
      }
      console.log('🔄 Program functions not available, using standalone NFT fetching...');
      
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        // Use standalone NFT fetcher
        const userNFTs = await fetchWalletNFTsStandalone(
          publicKey.toBase58(),
          connection.rpcEndpoint
        );
        
        // Convert to NFTListing format for consistent display
        const ownedNFTListings = userNFTs.map(nft => 
          userNFTToListing(nft, publicKey.toBase58())
        );
        
        // Set user portfolio with fetched NFTs
        const userPortfolio: UserPortfolio = {
          ownedNFTs: ownedNFTListings,
          listedNFTs: [], // No marketplace listings available without program
          totalValue: 0, // Can't calculate without listings
          totalListings: 0
        };
        
        dispatch({ type: 'SET_USER_PORTFOLIO', payload: userPortfolio });

        // Fetch user purchases from Fastify server
        try {
          const purchasesResponse = await fetch(`${apiUrl}/users/${publicKey.toBase58()}/purchases`);
          if (purchasesResponse.ok) {
            const backendPurchases = await purchasesResponse.json();
            dispatch({ type: 'SET_USER_PURCHASES', payload: backendPurchases });
          } else {
            dispatch({ type: 'SET_USER_PURCHASES', payload: [] });
          }
        } catch (purchasesErr) {
          console.warn('Failed to fetch user purchases in standalone mode:', purchasesErr);
          dispatch({ type: 'SET_USER_PURCHASES', payload: [] });
        }
        
        // Set basic stats
        const defaultStats: MarketplaceStats = {
          totalListings: 0,
          totalSales: 0,
          totalVolume: 0,
          averagePrice: 0,
          uniqueOwners: 0,
          floorPrice: 0
        };
        dispatch({ type: 'SET_STATS', payload: defaultStats });
        dispatch({ type: 'SET_LISTINGS', payload: [] });
        
        console.log(`✅ Standalone mode: Found ${userNFTs.length} NFTs in wallet`);
        
      } catch (error) {
        console.error('❌ Standalone NFT fetching failed:', error);
        dispatch({ type: 'SET_ERROR', payload: `Failed to fetch NFTs: ${error.message}` });
        
        // Set empty state
        dispatch({ type: 'SET_STATS', payload: {
          totalListings: 0,
          totalSales: 0,
          totalVolume: 0,
          averagePrice: 0,
          uniqueOwners: 0,
          floorPrice: 0
        } as MarketplaceStats });
        dispatch({ type: 'SET_LISTINGS', payload: [] });
        dispatch({ type: 'SET_USER_PORTFOLIO', payload: {
          ownedNFTs: [],
          listedNFTs: [],
          totalValue: 0,
          totalListings: 0
        } as UserPortfolio });
        dispatch({ type: 'SET_USER_PURCHASES', payload: [] });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
      
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      console.log('Fetching marketplace data...');
      
      // First try to fetch marketplace account
      const marketplaceData = await fetchMarketplace();
      if (marketplaceData) {
        const marketplace: Marketplace = {
          id: 'marketplace-1',
          name: marketplaceData.name,
          authority: marketplaceData.authority.toBase58(),
          fee: marketplaceData.feeBps / 100, // Convert basis points to percentage
          treasury: marketplaceData.treasury.toBase58(),
          totalListings: 0, // Not tracked in the marketplace account
          totalSales: 0, // Not tracked in the marketplace account
          totalVolume: 0, // Not tracked in the marketplace account
          createdAt: new Date().toISOString() // Placeholder
        };
        if (activeChainRef.current !== fetchChain) return;
        dispatch({ type: 'SET_MARKETPLACE', payload: marketplace });
        console.log('Marketplace data fetched successfully');
      } else {
        console.log('Marketplace account not found - may need to be initialized');
        // Create empty marketplace for UI but still continue to load listings/portfolio
        const [marketplacePDA] = getMarketplacePDA();
        const emptyMarketplace: Marketplace = {
          id: 'marketplace-not-initialized',
          name: 'Marketplace (Not Initialized)',
          authority: publicKey ? publicKey.toBase58() : marketplacePDA.toBase58(),
          fee: 2.5,
          treasury: publicKey ? publicKey.toBase58() : marketplacePDA.toBase58(),
          totalListings: 0,
          totalSales: 0,
          totalVolume: 0,
          createdAt: new Date().toISOString()
        };
        if (activeChainRef.current !== fetchChain) return;
        dispatch({ type: 'SET_MARKETPLACE', payload: emptyMarketplace });
      }

      // Fetch all listings
      console.log('Fetching all listings...');
      const listingAccounts = await fetchAllListings();
      console.log(`Found ${listingAccounts.length} listings`);
      
      // Batch fetch NFT metadata for better performance
      const nftMints = listingAccounts.map(listing => listing.nftMint);
      console.log('Fetching NFT metadata...');
      const metadataMap = await batchFetchNFTMetadata(connection, nftMints);
      console.log(`Fetched metadata for ${metadataMap.size} NFTs`);
      
      // Convert listings with real metadata
      const nftListings = await Promise.all(
        listingAccounts.map(listingAccount => 
          convertListingToNFTListing(
            listingAccount, 
            listingAccount.publicKey.toBase58(),
            metadataMap
          )
        )
      );
      if (activeChainRef.current !== fetchChain) return;
      dispatch({ type: 'SET_LISTINGS', payload: nftListings });

      // Calculate stats from listings
      let stats: MarketplaceStats;
      
      try {
        const [marketplacePDA] = getMarketplacePDA();
        const statsResponse = await fetch(`${apiUrl}/stats/${marketplacePDA.toBase58()}`);
        if (statsResponse.ok) {
          const backendStats = await statsResponse.json();
          stats = {
            totalListings: backendStats.activeListingsCount,
            totalSales: backendStats.salesCount,
            totalVolume: lamportsToSol(backendStats.totalVolume),
            averagePrice: backendStats.salesCount > 0 ? lamportsToSol(backendStats.totalVolume) / backendStats.salesCount : 0,
            uniqueOwners: new Set(listingAccounts.map(listing => listing.maker.toBase58())).size,
            floorPrice: lamportsToSol(backendStats.floorPrice)
          };
          if (activeChainRef.current !== fetchChain) return;
          if (backendStats.rateLimit !== undefined) {
            dispatch({ type: 'SET_MARKETPLACE_RATE_LIMIT', payload: backendStats.rateLimit });
          }
        } else {
          throw new Error('Stats fetch response was not ok');
        }
      } catch (statsErr) {
        console.warn('Failed to fetch stats from backend API, calculating locally:', statsErr);
        const totalVolume = listingAccounts.reduce((sum, listing) => sum + lamportsToSol(listing.price), 0);
        stats = {
          totalListings: listingAccounts.length,
          totalSales: 0,
          totalVolume: totalVolume,
          averagePrice: listingAccounts.length > 0 ? totalVolume / listingAccounts.length : 0,
          uniqueOwners: new Set(listingAccounts.map(listing => listing.maker.toBase58())).size,
          floorPrice: listingAccounts.length > 0 ? Math.min(...listingAccounts.map(listing => lamportsToSol(listing.price))) : 0
        };
      }
      if (activeChainRef.current !== fetchChain) return;
      dispatch({ type: 'SET_STATS', payload: stats });

      // Update user portfolio if wallet is connected
      let userPortfolio: UserPortfolio = emptyUserPortfolio;
      if (publicKey) {
        const userListings = nftListings.filter(listing => listing.seller === publicKey.toBase58());
        
        // Fetch user's owned NFTs (with timeout and error handling)
        let ownedNFTListings: NFTListing[] = [];
        try {
          console.log('Fetching user NFTs...');
          
          // Set a timeout for user NFT fetching to prevent hanging
          const userNFTsPromise = fetchUserNFTs(connection, publicKey);
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('User NFT fetch timeout')), 15000)
          );
          
          const userNFTs = await Promise.race([userNFTsPromise, timeoutPromise]);
          console.log(`Found ${userNFTs.length} owned NFTs`);
          
          // Convert to NFTListing format for consistent display
          ownedNFTListings = userNFTs.map(nft => 
            userNFTToListing(nft, publicKey.toBase58())
          );
        } catch (error) {
          console.warn('Failed to fetch user NFTs, continuing without them:', error);
          ownedNFTListings = [];
        }
        
        // Calculate total portfolio value
        const totalValue = userListings.reduce((sum, listing) => sum + listing.price, 0);
        
        userPortfolio = {
          ownedNFTs: ownedNFTListings,
          listedNFTs: userListings,
          totalValue: totalValue,
          totalListings: userListings.length
        };

        // Fetch user purchases from Fastify server
        try {
          const purchasesResponse = await fetch(`${apiUrl}/users/${publicKey.toBase58()}/purchases`);
          if (purchasesResponse.ok) {
            const backendPurchases = await purchasesResponse.json();
            if (activeChainRef.current !== fetchChain) return;
            dispatch({ type: 'SET_USER_PURCHASES', payload: backendPurchases });
          } else {
            if (activeChainRef.current !== fetchChain) return;
            dispatch({ type: 'SET_USER_PURCHASES', payload: [] });
          }
        } catch (purchasesErr) {
          console.warn('Failed to fetch user purchases from backend API:', purchasesErr);
          if (activeChainRef.current !== fetchChain) return;
          dispatch({ type: 'SET_USER_PURCHASES', payload: [] });
        }
      } else {
        if (activeChainRef.current !== fetchChain) return;
        dispatch({ type: 'SET_USER_PURCHASES', payload: [] });
      }
      if (activeChainRef.current !== fetchChain) return;
      dispatch({ type: 'SET_USER_PORTFOLIO', payload: userPortfolio });

      console.log('Marketplace data refresh completed successfully');

    } catch (error: any) {
      console.error('Error refreshing data:', error);
      
      // For real mode, show actual errors instead of fallback
      console.log('Real mode enabled - showing actual blockchain errors');
      
      if (activeChainRef.current !== fetchChain) return;
      if (error.message?.includes('Account does not exist')) {
        dispatch({ type: 'SET_ERROR', payload: 'Marketplace not initialized. Please go to Admin panel and click "Initialize Marketplace".' });
        // Set empty data but no fallback
        dispatch({ type: 'SET_STATS', payload: emptyStats });
        dispatch({ type: 'SET_LISTINGS', payload: [] });
        dispatch({ type: 'SET_USER_PORTFOLIO', payload: emptyUserPortfolio });
        dispatch({ type: 'SET_USER_PURCHASES', payload: [] });
      } else if (error.message?.includes('timeout') || error.message?.includes('fetch')) {
        dispatch({ type: 'SET_ERROR', payload: 'Network error. Please check your connection and try again.' });
        dispatch({ type: 'SET_STATS', payload: emptyStats });
        dispatch({ type: 'SET_LISTINGS', payload: [] });
        dispatch({ type: 'SET_USER_PORTFOLIO', payload: emptyUserPortfolio });
        dispatch({ type: 'SET_USER_PURCHASES', payload: [] });
      } else {
        // Show real error for debugging
        dispatch({ type: 'SET_ERROR', payload: `Blockchain Error: ${error.message}` });
        dispatch({ type: 'SET_STATS', payload: emptyStats });
        dispatch({ type: 'SET_LISTINGS', payload: [] });
        dispatch({ type: 'SET_USER_PORTFOLIO', payload: emptyUserPortfolio });
        dispatch({ type: 'SET_USER_PURCHASES', payload: [] });
      }
    } finally {
      if (activeChainRef.current === fetchChain) {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  };

  // Load marketplace data when connection and program are ready, or when wallet changes
  useEffect(() => {
    const load = () => {
      refreshData().catch((error) => {
        console.warn('Failed to load marketplace data:', error);
        dispatch({ type: 'SET_ERROR', payload: `Failed to load data: ${error.message}` });
      });
    };

    if (activeChain === 'evm') {
      load();
    } else if (connection && program) {
      console.log('Connection and program ready, loading marketplace data...');
      debugConnectionState(connection, publicKey || PublicKey.default, program);
      const timeout = setTimeout(load, 500);
      return () => clearTimeout(timeout);
    }
  }, [publicKey, connection, program, activeChain, evmProgram.walletAddress]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let reconnectDelay = 1000;
    const maxReconnectDelay = 30000;
    let isMounted = true;

    function connectWS() {
      if (!isMounted) return;

      try {
        const wsUrl = getWebSocketUrl();
        console.log(`🔌 [WS Client] Connecting to real-time events at ${wsUrl}...`);
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log('🔌 [WS Client] Connected to real-time updates!');
          reconnectDelay = 1000; // Reset delay on successful connection
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            const { subject, payload } = message;
            console.log(`🔌 [WS Client] Received event:`, subject, payload);

            if (subject === 'marketplace.event') {
              const { event: eventType, chain, data } = payload;
              if (chain === activeChainRef.current) {
                if (eventType === 'listed') {
                  const newListing = parseListingEvent(data, chain);
                  dispatch({ type: 'ADD_LISTING', payload: newListing });
                  // Refresh other stats & portfolio in background
                  refreshData().catch(err => console.warn('Background refresh error:', err));
                } else if (eventType === 'purchased' || eventType === 'delisted') {
                  dispatch({ type: 'REMOVE_LISTING', payload: data.address });
                  refreshData().catch(err => console.warn('Background refresh error:', err));
                }
              }
            } else if (subject === 'marketplace.metadata') {
              const { event: eventType, chain } = payload;
              if (chain === activeChainRef.current && eventType === 'registered') {
                refreshData().catch(err => console.warn('Background refresh error:', err));
              }
            }
          } catch (parseErr: any) {
            console.error('🔌 [WS Client] Failed to parse message:', parseErr.message);
          }
        };

        socket.onclose = (e) => {
          console.log(`🔌 [WS Client] Connection closed: ${e.code} - ${e.reason || 'No reason provided'}`);
          scheduleReconnect();
        };

        socket.onerror = (err) => {
          console.error('🔌 [WS Client] Connection error:', err);
          // close event will trigger reconnect
        };
      } catch (err) {
        console.error('🔌 [WS Client] Error starting WebSocket:', err);
        scheduleReconnect();
      }
    }

    function scheduleReconnect() {
      if (!isMounted) return;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      
      console.log(`🔌 [WS Client] Reconnecting in ${reconnectDelay}ms...`);
      reconnectTimeout = setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
        connectWS();
      }, reconnectDelay);
    }

    connectWS();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        // Prevent reconnect callback on explicit cleanup
        socket.onclose = null;
        socket.close();
        console.log('🔌 [WS Client] Connection cleaned up');
      }
    };
  }, []);

  const contextValue: MarketplaceContextType = {
    ...state,
    activeChain,
    setActiveChain,
    evmWalletAddress: evmProgram.walletAddress,
    evmConnected: evmProgram.isConnected,
    connectEVMWallet: evmProgram.connectWallet,
    disconnectEVMWallet: evmProgram.disconnectWallet,
    mintEVMNFT: evmProgram.mintNFT,
    initializeMarketplace,
    listNFT,
    purchaseNFT,
    delistNFT,
    updateFee,
    updateRateLimit,
    refreshData,
  };

  return (
    <MarketplaceContext.Provider value={contextValue}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const context = useContext(MarketplaceContext);
  if (!context) {
    throw new Error('useMarketplace must be used within a MarketplaceProvider');
  }
  return context;
}