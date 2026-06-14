import { 
  Connection, 
  Transaction, 
  TransactionSignature, 
  PublicKey, 
  SystemProgram,
  ComputeBudgetProgram,
  TransactionInstruction,
  SendOptions
} from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';
import { toast } from 'react-hot-toast';
import { handleBlockchainError, waitForConfirmation, retryTransaction } from './errorHandling';

export interface TransactionConfig {
  skipPreflight?: boolean;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  maxRetries?: number;
  timeout?: number;
  computeUnitLimit?: number;
  computeUnitPrice?: number;
}

export interface TransactionResult {
  signature: string;
  confirmed: boolean;
  error?: string;
}

export class TransactionBuilder {
  private instructions: TransactionInstruction[] = [];
  private signers: any[] = [];
  private connection: Connection;
  private provider: AnchorProvider;

  constructor(connection: Connection, provider: AnchorProvider) {
    this.connection = connection;
    this.provider = provider;
  }

  addInstruction(instruction: TransactionInstruction): TransactionBuilder {
    this.instructions.push(instruction);
    return this;
  }

  addInstructions(instructions: TransactionInstruction[]): TransactionBuilder {
    this.instructions.push(...instructions);
    return this;
  }

  addSigner(signer: any): TransactionBuilder {
    this.signers.push(signer);
    return this;
  }

  setComputeLimit(units: number): TransactionBuilder {
    const instruction = ComputeBudgetProgram.setComputeUnitLimit({
      units
    });
    this.instructions.unshift(instruction);
    return this;
  }

  setComputePrice(microLamports: number): TransactionBuilder {
    const instruction = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports
    });
    this.instructions.unshift(instruction);
    return this;
  }

  async build(): Promise<Transaction> {
    const transaction = new Transaction();
    transaction.add(...this.instructions);

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.provider.wallet.publicKey;

    return transaction;
  }

  async sendAndConfirm(config: TransactionConfig = {}): Promise<TransactionResult> {
    const {
      skipPreflight = false,
      commitment = 'confirmed',
      maxRetries = 3,
      timeout = 30000,
      computeUnitLimit,
      computeUnitPrice
    } = config;

    try {
      // Add compute budget instructions if specified
      if (computeUnitLimit) {
        this.setComputeLimit(computeUnitLimit);
      }
      if (computeUnitPrice) {
        this.setComputePrice(computeUnitPrice);
      }

      const transaction = await this.build();

      // Sign transaction
      if (this.signers.length > 0) {
        transaction.partialSign(...this.signers);
      }

      const signature = await retryTransaction(async () => {
        return await this.provider.sendAndConfirm(transaction, this.signers, {
          skipPreflight,
          commitment,
          maxRetries: 1 // We handle retries at a higher level
        });
      }, maxRetries);

      // Wait for confirmation
      const confirmed = await waitForConfirmation(
        this.connection, 
        signature, 
        timeout
      );

      return {
        signature,
        confirmed,
        error: confirmed ? undefined : 'Transaction failed to confirm'
      };

    } catch (error: any) {
      console.error('Transaction failed:', error);
      return {
        signature: '',
        confirmed: false,
        error: error.message || 'Transaction failed'
      };
    }
  }
}

// Helper functions for common transaction patterns
export async function sendTransaction(
  connection: Connection,
  provider: AnchorProvider,
  instructions: TransactionInstruction[],
  config: TransactionConfig = {}
): Promise<TransactionResult> {
  const builder = new TransactionBuilder(connection, provider);
  return builder
    .addInstructions(instructions)
    .sendAndConfirm(config);
}

export async function sendTransactionWithToast(
  connection: Connection,
  provider: AnchorProvider,
  instructions: TransactionInstruction[],
  config: TransactionConfig = {},
  messages: {
    pending?: string;
    success?: string;
    error?: string;
  } = {}
): Promise<TransactionResult> {
  const {
    pending = 'Processing transaction...',
    success = 'Transaction completed successfully!',
    error = 'Transaction failed'
  } = messages;

  // Show pending toast
  const toastId = toast.loading(pending);

  try {
    const result = await sendTransaction(connection, provider, instructions, config);
    
    if (result.confirmed) {
      toast.success(success, { id: toastId });
    } else {
      toast.error(result.error || error, { id: toastId });
    }

    return result;
  } catch (err: any) {
    toast.error(err.message || error, { id: toastId });
    return {
      signature: '',
      confirmed: false,
      error: err.message || error
    };
  }
}

// Utility to check if an account exists
export async function accountExists(
  connection: Connection,
  publicKey: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(publicKey);
    return accountInfo !== null;
  } catch (error) {
    return false;
  }
}

// Utility to get minimum rent exemption for an account
export async function getMinimumRentExemption(
  connection: Connection,
  dataLength: number
): Promise<number> {
  return await connection.getMinimumBalanceForRentExemption(dataLength);
}

// Utility to check wallet balance
export async function checkWalletBalance(
  connection: Connection,
  publicKey: PublicKey,
  requiredAmount: number
): Promise<{ sufficient: boolean; balance: number; required: number }> {
  try {
    const balance = await connection.getBalance(publicKey);
    return {
      sufficient: balance >= requiredAmount,
      balance,
      required: requiredAmount
    };
  } catch (error) {
    return {
      sufficient: false,
      balance: 0,
      required: requiredAmount
    };
  }
}

// Helper to estimate transaction fee
export async function estimateTransactionFee(
  connection: Connection,
  transaction: Transaction
): Promise<number> {
  try {
    const response = await connection.getFeeForMessage(
      transaction.compileMessage(),
      'confirmed'
    );
    return response.value || 5000; // Fallback to 5000 lamports
  } catch (error) {
    return 5000; // Fallback fee
  }
}

// Priority fee estimation
export async function getRecommendedPriorityFee(
  connection: Connection
): Promise<number> {
  try {
    // Get recent priority fees
    const recentFees = await connection.getRecentPrioritizationFees();
    
    if (recentFees.length === 0) {
      return 1000; // Default 1000 micro-lamports
    }

    // Calculate median priority fee
    const fees = recentFees
      .map(fee => fee.prioritizationFee)
      .sort((a, b) => a - b);
    
    const medianIndex = Math.floor(fees.length / 2);
    const medianFee = fees[medianIndex];
    
    // Add 20% buffer and ensure minimum
    return Math.max(medianFee * 1.2, 1000);
  } catch (error) {
    console.warn('Failed to get priority fees:', error);
    return 1000; // Fallback
  }
}

// Transaction simulation
export async function simulateTransaction(
  connection: Connection,
  transaction: Transaction
): Promise<{ success: boolean; logs?: string[]; error?: string }> {
  try {
    const result = await connection.simulateTransaction(transaction);
    
    return {
      success: !result.value.err,
      logs: result.value.logs || [],
      error: result.value.err ? String(result.value.err) : undefined
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Simulation failed'
    };
  }
}

// Batch multiple transactions
export async function sendBatchTransactions(
  connection: Connection,
  provider: AnchorProvider,
  transactionBatches: TransactionInstruction[][],
  config: TransactionConfig = {}
): Promise<TransactionResult[]> {
  const results: TransactionResult[] = [];

  for (let i = 0; i < transactionBatches.length; i++) {
    const batch = transactionBatches[i];
    const result = await sendTransaction(connection, provider, batch, config);
    results.push(result);

    // If one transaction fails, we might want to stop
    if (!result.confirmed && config.maxRetries === 0) {
      break;
    }

    // Small delay between batches to avoid rate limiting
    if (i < transactionBatches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// Helper to create program derived address
export function findProgramAddress(
  seeds: (Buffer | Uint8Array)[],
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

// Export utility constants
export const DEFAULT_TRANSACTION_CONFIG: TransactionConfig = {
  skipPreflight: false,
  commitment: 'confirmed',
  maxRetries: 3,
  timeout: 30000,
  computeUnitLimit: 200000,
  computeUnitPrice: 1000
};

export const PRIORITY_TRANSACTION_CONFIG: TransactionConfig = {
  ...DEFAULT_TRANSACTION_CONFIG,
  computeUnitPrice: 5000, // Higher priority fee
  maxRetries: 5
};