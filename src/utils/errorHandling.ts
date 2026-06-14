import { toast } from 'react-hot-toast';

export interface SolanaError {
  code?: number;
  message: string;
  logs?: string[];
}

export class BlockchainError extends Error {
  public code?: number;
  public logs?: string[];

  constructor(message: string, code?: number, logs?: string[]) {
    super(message);
    this.name = 'BlockchainError';
    this.code = code;
    this.logs = logs;
  }
}

// Common Solana error codes and their user-friendly messages
const ERROR_MESSAGES: Record<number, string> = {
  // Your program specific errors
  6000: 'The name shouldn\'t be empty or exceed 32 characters',
  6001: 'The fee cannot exceed 10,000 basis points (100%)',
  6002: 'The listing price must be greater than zero',
  6003: 'The listing owner does not match the signer',
  6004: 'The NFT token account has insufficient balance',
  6005: 'The NFT is not transferable',
  6006: 'The NFT account is frozen and cannot be transferred',
  6007: 'The provided metadata account does not match the NFT mint',
  6008: 'The royalty percentage is invalid',
  6009: 'The authority is not authorized to perform this action',
  6010: 'Rate limit exceeded. Please try again later',

  // Anchor/Solana errors
  100: 'Invalid account provided',
  101: 'Invalid instruction data',
  102: 'Invalid account data',
  103: 'Account already in use',
  104: 'Invalid program ID',
  105: 'Not enough account keys',
  106: 'Account data too small',
  107: 'Invalid account owner',
  108: 'Account already exists',
  109: 'Invalid signature',
  110: 'Transaction failed to confirm',

  // RPC errors
  '-32002': 'Transaction simulation failed',
  '-32003': 'Transaction was not confirmed',
  '-32005': 'Node is unhealthy',
  '-32007': 'Transaction expired',
};

export function parseBlockchainError(error: any): BlockchainError {
  let message = 'Unknown blockchain error';
  let code: number | undefined;
  let logs: string[] | undefined;

  if (error?.message) {
    message = error.message;
  }

  // Parse Anchor program errors
  if (error?.error?.errorCode?.code) {
    code = error.error.errorCode.code;
    message = ERROR_MESSAGES[code] || error.error.errorMessage || message;
  }

  // Parse RPC errors
  if (error?.code) {
    code = error.code;
    message = ERROR_MESSAGES[code] || error.message || message;
  }

  // Extract transaction logs if available
  if (error?.logs) {
    logs = error.logs;
  }

  // Handle specific error patterns
  if (message.includes('0x1')) {
    message = 'Insufficient funds for transaction';
  } else if (message.includes('0x0')) {
    message = 'Transaction failed - please try again';
  } else if (message.includes('Account does not exist')) {
    message = 'Account not found - make sure the marketplace is initialized';
  } else if (message.includes('User rejected the request')) {
    message = 'Transaction was cancelled by user';
  } else if (message.includes('Wallet not connected')) {
    message = 'Please connect your wallet to continue';
  } else if (message.includes('Transaction timeout')) {
    message = 'Transaction timed out - please try again';
  }

  return new BlockchainError(message, code, logs);
}

export function handleBlockchainError(error: any, context?: string): void {
  const parsedError = parseBlockchainError(error);
  
  console.error(`Blockchain error${context ? ` in ${context}` : ''}:`, {
    message: parsedError.message,
    code: parsedError.code,
    logs: parsedError.logs,
    originalError: error
  });

  // Show user-friendly toast notification
  toast.error(parsedError.message);
}

export function isUserRejectedError(error: any): boolean {
  return error?.message?.includes('User rejected the request') || 
         error?.code === 4001;
}

export function isInsufficientFundsError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('insufficient funds') ||
         message.includes('0x1') ||
         error?.code === 6003;
}

export function isAccountNotFoundError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('account does not exist') ||
         message.includes('invalid account data') ||
         message.includes('could not find account');
}

export function isTransactionTimeoutError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('timeout') ||
         message.includes('expired') ||
         error?.code === -32007;
}

// Utility function to retry failed transactions
export async function retryTransaction<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry user rejections
      if (isUserRejectedError(error)) {
        throw error;
      }

      // Don't retry on final attempt
      if (i === maxRetries - 1) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }

  throw lastError;
}

// Transaction confirmation utilities
export async function confirmTransaction(
  connection: any,
  signature: string,
  commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'
): Promise<boolean> {
  try {
    const result = await connection.confirmTransaction(signature, commitment);
    return !result.value.err;
  } catch (error) {
    console.error('Error confirming transaction:', error);
    return false;
  }
}

export async function waitForConfirmation(
  connection: any,
  signature: string,
  timeout: number = 30000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const status = await connection.getSignatureStatus(signature);
      
      if (status?.value?.confirmationStatus === 'confirmed' || 
          status?.value?.confirmationStatus === 'finalized') {
        return !status.value.err;
      }

      if (status?.value?.err) {
        return false;
      }

      // Wait 500ms before checking again
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error checking transaction status:', error);
    }
  }

  return false;
}