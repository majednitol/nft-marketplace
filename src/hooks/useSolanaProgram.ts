import { useMemo, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction, TransactionSignature } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import MarketplaceIDL from '../idl/anchor_nft_marketplace.json';

// Load configuration from environment variables
const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || '6MAZYi6WaiB8ztJuJjoAVkbQDxZxfuQuJR3KfrfZncih'
);

// Use the IDL directly - convert to proper Anchor format for 0.31.0+
const MARKETPLACE_IDL = MarketplaceIDL as any;

// Default marketplace name for PDA derivation
const DEFAULT_MARKETPLACE_NAME = import.meta.env.VITE_MARKETPLACE_NAME || 'NFT-Nexus';

// Transaction configuration from environment
const DEFAULT_CONFIG = {
  commitment: (import.meta.env.VITE_COMMITMENT || 'confirmed') as 'processed' | 'confirmed' | 'finalized',
  preflightCommitment: (import.meta.env.VITE_PREFLIGHT_COMMITMENT || 'confirmed') as 'processed' | 'confirmed' | 'finalized',
  skipPreflight: import.meta.env.VITE_SKIP_PREFLIGHT === 'true',
  computeUnitLimit: parseInt(import.meta.env.VITE_DEFAULT_COMPUTE_UNIT_LIMIT || '200000'),
  computeUnitPrice: parseInt(import.meta.env.VITE_DEFAULT_COMPUTE_UNIT_PRICE || '1000'),
  transactionTimeout: parseInt(import.meta.env.VITE_TRANSACTION_TIMEOUT || '30000'),
  maxRetries: parseInt(import.meta.env.VITE_MAX_RETRIES || '3')
};

// Metaplex constants
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export interface MarketplaceAccount {
  authority: PublicKey;
  feeBps: number;
  marketplaceBump: number;
  treasury: PublicKey;
  treasuryBump: number;
  name: string;
}

export interface ListingAccount {
  maker: PublicKey;
  nftMint: PublicKey;
  price: number;
  metadata: PublicKey;
  bump: number;
}

export function useSolanaProgram() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();

  const provider = useMemo(() => {
    const wallet = (publicKey && signTransaction && signAllTransactions)
      ? { publicKey, signTransaction, signAllTransactions }
      : {
          publicKey: SystemProgram.programId,
          signTransaction: async (tx: Transaction) => tx,
          signAllTransactions: async (txs: Transaction[]) => txs,
        };
    
    return new AnchorProvider(
      connection,
      wallet,
      { 
        commitment: DEFAULT_CONFIG.commitment,
        preflightCommitment: DEFAULT_CONFIG.preflightCommitment,
        skipPreflight: DEFAULT_CONFIG.skipPreflight
      }
    );
  }, [connection, publicKey, signTransaction, signAllTransactions]);

  const program = useMemo(() => {
    if (!provider) {
      console.log('⏳ Provider not ready yet...');
      return null;
    }
    
    try {
      console.log('Creating Anchor program with fixed IDL...');
      console.log('Program ID:', PROGRAM_ID.toBase58());
      console.log('Provider connected:', provider.publicKey?.toBase58());
      
      const prog = new Program(MARKETPLACE_IDL, provider);
      console.log('✅ Anchor program created successfully');
      console.log('Available methods:', Object.keys(prog.methods));
      return prog;
    } catch (error) {
      console.error('❌ Error creating Anchor program:', error);
      console.error('Provider:', provider);
      console.error('Program ID:', PROGRAM_ID.toBase58());
      
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      return null;
    }
  }, [provider]);

  // PDA derivation functions
  const getMarketplacePDA = useCallback((name: string = DEFAULT_MARKETPLACE_NAME): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('marketplace'), Buffer.from(name)],
      PROGRAM_ID
    );
  }, []);

  const getTreasuryPDA = useCallback((marketplace: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('treasury'), marketplace.toBuffer()],
      PROGRAM_ID
    );
  }, []);

  const getListingPDA = useCallback((marketplace: PublicKey, nftMint: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [marketplace.toBuffer(), nftMint.toBuffer()],
      PROGRAM_ID
    );
  }, []);

  const getVaultPDA = useCallback(async (listing: PublicKey, nftMint: PublicKey): Promise<PublicKey> => {
    return await getAssociatedTokenAddress(nftMint, listing, true);
  }, []);

  const getMetadataPDA = useCallback((nftMint: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), nftMint.toBuffer()],
      METADATA_PROGRAM_ID
    );
  }, []);

  const getMasterEditionPDA = useCallback((nftMint: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), nftMint.toBuffer(), Buffer.from('edition')],
      METADATA_PROGRAM_ID
    );
  }, []);

  // Program instruction wrappers
  const initializeMarketplace = useCallback(async (
    name: string = DEFAULT_MARKETPLACE_NAME,
    fee: number = 250 // 2.5% in basis points
  ): Promise<TransactionSignature | null> => {
    if (!program || !publicKey) return null;

    try {
      const [marketplacePDA] = getMarketplacePDA(name);
      const [treasuryPDA] = getTreasuryPDA(marketplacePDA);

      const tx = await program.methods
        .initializeMarketplace(name, fee)
        .accounts({
          admin: publicKey,
          marketplace: marketplacePDA,
          treasury: treasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error initializing marketplace:', error);
      throw error;
    }
  }, [program, publicKey, getMarketplacePDA, getTreasuryPDA]);

  const listNft = useCallback(async (
    nftMint: PublicKey,
    price: number // in lamports
  ): Promise<TransactionSignature | null> => {
    if (!program || !publicKey) return null;

    try {
      const [marketplacePDA] = getMarketplacePDA();
      const [listingPDA] = getListingPDA(marketplacePDA, nftMint);
      const [metadataPDA] = getMetadataPDA(nftMint);
      const [masterEditionPDA] = getMasterEditionPDA(nftMint);
      
      const makerNftAta = await getAssociatedTokenAddress(nftMint, publicKey);
      const vaultPDA = await getAssociatedTokenAddress(nftMint, listingPDA, true);

      const tx = await program.methods
        .listNft(new BN(price))
        .accounts({
          maker: publicKey,
          marketplace: marketplacePDA,
          makerNftMint: nftMint,
          makerNftAta: makerNftAta,
          vault: vaultPDA,
          listing: listingPDA,
          metadata: metadataPDA,
          masterEdition: masterEditionPDA,
          metadataProgram: METADATA_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error listing NFT:', error);
      throw error;
    }
  }, [program, publicKey, getMarketplacePDA, getListingPDA, getMetadataPDA, getMasterEditionPDA]);

  const purchaseNft = useCallback(async (
    nftMint: PublicKey,
    seller: PublicKey
  ): Promise<TransactionSignature | null> => {
    if (!program || !publicKey) return null;

    try {
      const [marketplacePDA] = getMarketplacePDA();
      const [listingPDA] = getListingPDA(marketplacePDA, nftMint);
      const [treasuryPDA] = getTreasuryPDA(marketplacePDA);
      const [metadataPDA] = getMetadataPDA(nftMint);
      
      const takerAta = await getAssociatedTokenAddress(nftMint, publicKey);
      const vaultPDA = await getAssociatedTokenAddress(nftMint, listingPDA, true);

      const tx = await program.methods
        .purchaseNft()
        .accounts({
          taker: publicKey,
          maker: seller,
          marketplace: marketplacePDA,
          takerNftAta: takerAta,
          vault: vaultPDA,
          listing: listingPDA,
          treasury: treasuryPDA,
          makerNftMint: nftMint,
          metadata: metadataPDA,
          masterEdition: getMasterEditionPDA(nftMint)[0],
          metadataProgram: METADATA_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error purchasing NFT:', error);
      throw error;
    }
  }, [program, publicKey, getMarketplacePDA, getListingPDA, getTreasuryPDA, getMetadataPDA, getMasterEditionPDA]);

  const delistNft = useCallback(async (
    nftMint: PublicKey
  ): Promise<TransactionSignature | null> => {
    if (!program || !publicKey) return null;

    try {
      const [marketplacePDA] = getMarketplacePDA();
      const [listingPDA] = getListingPDA(marketplacePDA, nftMint);
      const [metadataPDA] = getMetadataPDA(nftMint);
      const [masterEditionPDA] = getMasterEditionPDA(nftMint);
      
      const makerNftAta = await getAssociatedTokenAddress(nftMint, publicKey);
      const vaultPDA = await getAssociatedTokenAddress(nftMint, listingPDA, true);

      const tx = await program.methods
        .delistNft()
        .accounts({
          maker: publicKey,
          marketplace: marketplacePDA,
          makerNftMint: nftMint,
          makerNftAta: makerNftAta,
          vault: vaultPDA,
          listing: listingPDA,
          metadata: metadataPDA,
          masterEdition: masterEditionPDA,
          metadataProgram: METADATA_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error delisting NFT:', error);
      throw error;
    }
  }, [program, publicKey, getMarketplacePDA, getListingPDA, getMetadataPDA, getMasterEditionPDA]);

  const updateMarketplaceFee = useCallback(async (
    newFee: number
  ): Promise<TransactionSignature | null> => {
    if (!program || !publicKey) return null;

    try {
      const [marketplacePDA] = getMarketplacePDA();

      const tx = await program.methods
        .updateFee(newFee)
        .accounts({
          admin: publicKey,
          marketplace: marketplacePDA,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error updating marketplace fee:', error);
      throw error;
    }
  }, [program, publicKey, getMarketplacePDA]);


  // Note: updateRateLimit and updateAuthority are not available in current IDL

  // Fetch account data
  const fetchMarketplace = useCallback(async (name: string = DEFAULT_MARKETPLACE_NAME): Promise<MarketplaceAccount | null> => {
    if (!program) return null;

    try {
      const [marketplacePDA] = getMarketplacePDA(name);
      const marketplaceAccount = await program.account.marketplace.fetch(marketplacePDA);
      return marketplaceAccount as MarketplaceAccount;
    } catch (error) {
      console.error('Error fetching marketplace:', error);
      return null;
    }
  }, [program, getMarketplacePDA]);

  const fetchListing = useCallback(async (nftMint: PublicKey): Promise<ListingAccount | null> => {
    if (!program) return null;

    try {
      const [marketplacePDA] = getMarketplacePDA();
      const [listingPDA] = getListingPDA(marketplacePDA, nftMint);
      const listingAccount = await program.account.listing.fetch(listingPDA);
      return listingAccount as ListingAccount;
    } catch (error) {
      console.error('Error fetching listing:', error);
      return null;
    }
  }, [program, getMarketplacePDA, getListingPDA]);

  const fetchAllListings = useCallback(async (): Promise<(ListingAccount & { publicKey: PublicKey })[]> => {
    if (!program) return [];

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    try {
      const [marketplacePDA] = getMarketplacePDA();
      const response = await fetch(`${apiUrl}/listings?marketplace=${marketplacePDA.toBase58()}`);
      if (response.ok) {
        const data = await response.json();
        const listings: (ListingAccount & { publicKey: PublicKey })[] = [];
        
        for (const item of data) {
          try {
            listings.push({
              maker: new PublicKey(item.maker),
              nftMint: new PublicKey(item.nftMint),
              price: new BN(item.price),
              metadata: new PublicKey(item.metadataAddress),
              bump: 0,
              publicKey: new PublicKey(item.address)
            });
          } catch (err) {
            console.debug('Skipping mock/invalid listing entry:', item.address, err);
          }
        }
        return listings;
      }
    } catch (e) {
      console.warn('Failed to fetch listings from backend API, falling back to blockchain:', e);
    }

    try {
      const listings = await program.account.listing.all();
      return listings.map(listing => ({
        ...listing.account as ListingAccount,
        publicKey: listing.publicKey
      }));
    } catch (error) {
      console.error('Error fetching all listings:', error);
      return [];
    }
  }, [program, getMarketplacePDA]);

  // Utility functions
  const lamportsToSol = useCallback((lamports: number): number => {
    return lamports / LAMPORTS_PER_SOL;
  }, []);

  const solToLamports = useCallback((sol: number): number => {
    return Math.floor(sol * LAMPORTS_PER_SOL);
  }, []);

  return {
    // Core program objects
    program,
    provider,
    programId: PROGRAM_ID,
    
    // PDA derivation
    getMarketplacePDA,
    getTreasuryPDA,
    getListingPDA,
    getVaultPDA,
    getMetadataPDA,
    getMasterEditionPDA,
    
    // Program instructions
    initializeMarketplace,
    listNft,
    purchaseNft,
    delistNft,
    updateMarketplaceFee,
    
    // Account fetching
    fetchMarketplace,
    fetchListing,
    fetchAllListings,
    
    // Utilities
    lamportsToSol,
    solToLamports,
  };
}