import React, { useCallback } from 'react';
import { toast, Toast } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Info, X, ExternalLink, Copy, Eye } from 'lucide-react';
import { Button } from '../common/Button';

export interface ToastAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: React.ComponentType<{ className?: string }>;
}

export interface EnhancedToastProps {
  toast: Toast;
  title: string;
  message?: string;
  actions?: ToastAction[];
  dismissible?: boolean;
  persistent?: boolean;
}

const ToastIcon = ({ type }: { type: Toast['type'] }) => {
  const iconClass = "h-5 w-5";
  
  switch (type) {
    case 'success':
      return <CheckCircle className={`${iconClass} text-green-400`} />;
    case 'error':
      return <XCircle className={`${iconClass} text-red-400`} />;
    case 'loading':
      return (
        <div className={`${iconClass} animate-spin rounded-full border-2 border-primary-400 border-t-transparent`} />
      );
    default:
      return <Info className={`${iconClass} text-blue-400`} />;
  }
};

export const EnhancedToast: React.FC<EnhancedToastProps> = ({
  toast: toastData,
  title,
  message,
  actions = [],
  dismissible = true,
  persistent = false,
}) => {
  const handleDismiss = useCallback(() => {
    toast.dismiss(toastData.id);
  }, [toastData.id]);

  return (
    <div
      className={`
        max-w-md w-full bg-dark-700 border border-primary-800/30 rounded-xl shadow-xl
        transform transition-all duration-300 ease-in-out
        ${toastData.visible ? 'animate-enter' : 'animate-leave'}
      `}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <ToastIcon type={toastData.type} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-white font-medium text-sm">
                  {title}
                </h4>
                {message && (
                  <p className="text-gray-300 text-sm mt-1">
                    {message}
                  </p>
                )}
              </div>
              
              {dismissible && (
                <button
                  onClick={handleDismiss}
                  className="ml-2 p-1 hover:bg-dark-600 rounded-lg transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
            
            {actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant={action.variant || 'ghost'}
                    onClick={() => {
                      action.action();
                      if (!persistent) {
                        handleDismiss();
                      }
                    }}
                    className="text-xs"
                  >
                    {action.icon && <action.icon className="h-3 w-3 mr-1" />}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Progress bar for loading toasts */}
      {toastData.type === 'loading' && (
        <div className="h-1 bg-dark-600 rounded-b-xl overflow-hidden">
          <div className="h-full bg-primary-500 animate-pulse" />
        </div>
      )}
    </div>
  );
};

// Enhanced toast utilities
export const enhancedToast = {
  success: (title: string, options?: {
    message?: string;
    actions?: ToastAction[];
    duration?: number;
    persistent?: boolean;
  }) => {
    return toast.custom((t) => (
      <EnhancedToast
        toast={t}
        title={title}
        message={options?.message}
        actions={options?.actions}
        persistent={options?.persistent}
      />
    ), {
      duration: options?.persistent ? Infinity : (options?.duration || 4000),
    });
  },

  error: (title: string, options?: {
    message?: string;
    actions?: ToastAction[];
    duration?: number;
    persistent?: boolean;
  }) => {
    return toast.custom((t) => (
      <EnhancedToast
        toast={t}
        title={title}
        message={options?.message}
        actions={options?.actions}
        persistent={options?.persistent}
      />
    ), {
      duration: options?.persistent ? Infinity : (options?.duration || 6000),
    });
  },

  info: (title: string, options?: {
    message?: string;
    actions?: ToastAction[];
    duration?: number;
    persistent?: boolean;
  }) => {
    return toast.custom((t) => (
      <EnhancedToast
        toast={t}
        title={title}
        message={options?.message}
        actions={options?.actions}
        persistent={options?.persistent}
      />
    ), {
      duration: options?.persistent ? Infinity : (options?.duration || 4000),
    });
  },

  loading: (title: string, options?: {
    message?: string;
    actions?: ToastAction[];
    persistent?: boolean;
  }) => {
    return toast.custom((t) => (
      <EnhancedToast
        toast={t}
        title={title}
        message={options?.message}
        actions={options?.actions}
        persistent={options?.persistent}
        dismissible={false}
      />
    ), {
      duration: options?.persistent ? Infinity : 0,
    });
  },

  // Specialized NFT marketplace toasts
  nftListed: (nftName: string, price: number, transactionId?: string) => {
    const actions: ToastAction[] = [];
    
    if (transactionId) {
      actions.push({
        label: 'View Transaction',
        icon: ExternalLink,
        variant: 'secondary',
        action: () => {
          window.open(`https://explorer.solana.com/tx/${transactionId}?cluster=devnet`, '_blank');
        },
      });
    }

    return enhancedToast.success('NFT Listed Successfully!', {
      message: `${nftName} is now listed for ${price} SOL`,
      actions,
    });
  },

  nftSold: (nftName: string, price: number, buyer?: string, transactionId?: string) => {
    const actions: ToastAction[] = [];
    
    if (transactionId) {
      actions.push({
        label: 'View Transaction',
        icon: ExternalLink,
        variant: 'secondary',
        action: () => {
          window.open(`https://explorer.solana.com/tx/${transactionId}?cluster=devnet`, '_blank');
        },
      });
    }

    if (buyer) {
      actions.push({
        label: 'Copy Buyer Address',
        icon: Copy,
        variant: 'ghost',
        action: () => {
          navigator.clipboard.writeText(buyer);
          toast.success('Address copied to clipboard');
        },
      });
    }

    return enhancedToast.success('NFT Sold!', {
      message: `${nftName} sold for ${price} SOL`,
      actions,
    });
  },

  transactionPending: (operationType: string, transactionId?: string) => {
    const actions: ToastAction[] = [];
    
    if (transactionId) {
      actions.push({
        label: 'Track Transaction',
        icon: Eye,
        variant: 'secondary',
        action: () => {
          window.open(`https://explorer.solana.com/tx/${transactionId}?cluster=devnet`, '_blank');
        },
      });
    }

    return enhancedToast.loading(`${operationType} in Progress`, {
      message: 'Please wait while your transaction is processed...',
      actions,
      persistent: true,
    });
  },

  walletConnectionRequired: (onConnect?: () => void) => {
    const actions: ToastAction[] = [];
    
    if (onConnect) {
      actions.push({
        label: 'Connect Wallet',
        variant: 'primary',
        action: onConnect,
      });
    }

    return enhancedToast.error('Wallet Connection Required', {
      message: 'Please connect your wallet to continue',
      actions,
      persistent: true,
    });
  },

  networkError: (onRetry?: () => void) => {
    const actions: ToastAction[] = [];
    
    if (onRetry) {
      actions.push({
        label: 'Retry',
        variant: 'primary',
        action: onRetry,
      });
    }

    return enhancedToast.error('Network Error', {
      message: 'Failed to connect to the blockchain. Please try again.',
      actions,
    });
  },

  insufficientBalance: (required: number, available: number, onAddFunds?: () => void) => {
    const actions: ToastAction[] = [];
    
    if (onAddFunds) {
      actions.push({
        label: 'Add Funds',
        variant: 'primary',
        action: onAddFunds,
      });
    }

    return enhancedToast.error('Insufficient Balance', {
      message: `You need ${required} SOL but only have ${available} SOL`,
      actions,
    });
  },

  newNFTAlert: (nftName: string, price: number, onView?: () => void) => {
    const actions: ToastAction[] = [];
    
    if (onView) {
      actions.push({
        label: 'View NFT',
        icon: Eye,
        variant: 'primary',
        action: onView,
      });
    }

    return enhancedToast.info('New NFT Listed!', {
      message: `${nftName} is now available for ${price} SOL`,
      actions,
    });
  },

  priceAlert: (nftName: string, oldPrice: number, newPrice: number, onView?: () => void) => {
    const actions: ToastAction[] = [];
    
    if (onView) {
      actions.push({
        label: 'View NFT',
        icon: Eye,
        variant: 'primary',
        action: onView,
      });
    }

    const priceChange = newPrice < oldPrice ? 'reduced' : 'increased';
    const emoji = newPrice < oldPrice ? '📉' : '📈';

    return enhancedToast.info(`${emoji} Price Alert`, {
      message: `${nftName} price ${priceChange} from ${oldPrice} to ${newPrice} SOL`,
      actions,
    });
  },
};

// CSS for animations
const toastAnimations = `
  @keyframes animate-enter {
    0% {
      transform: translateX(100%);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes animate-leave {
    0% {
      transform: translateX(0);
      opacity: 1;
    }
    100% {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  .animate-enter {
    animation: animate-enter 0.3s ease-out;
  }

  .animate-leave {
    animation: animate-leave 0.2s ease-in;
  }
`;

// Inject animations into the document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = toastAnimations;
  document.head.appendChild(style);
}