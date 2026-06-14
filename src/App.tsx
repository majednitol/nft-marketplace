import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { WalletContextProvider } from './contexts/WalletContext';
import { MarketplaceProvider } from './contexts/MarketplaceContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { queryClient } from './lib/queryClient';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Lazy load components for code splitting
const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard').then(module => ({
  default: module.Dashboard
})));
const Explore = React.lazy(() => import('./components/explore/Explore').then(module => ({
  default: module.Explore
})));
const Portfolio = React.lazy(() => import('./components/portfolio/Portfolio').then(module => ({
  default: module.Portfolio
})));
const AdminPanel = React.lazy(() => import('./components/admin/AdminPanel').then(module => ({
  default: module.AdminPanel
})));
const Favorites = React.lazy(() => import('./components/favorites/Favorites').then(module => ({
  default: module.Favorites
})));
import { useMobileViewportHeight } from './components/mobile/MobileOptimizations';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import { useComponentPerformance, useMemoryPerformance, useBundlePerformance } from './hooks/usePerformance';
import { detectSlowRenders } from './utils/performance';
import { useGlobalKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useRealTimeUpdates } from './hooks/useRealTimeUpdates';
import { useSkipNavigation, useAriaLive } from './hooks/useAccessibility';

// Lazy load development components
const PerformanceDashboard = React.lazy(() => import('./components/dev/PerformanceDashboard').then(module => ({
  default: module.PerformanceDashboard
})));

const KeyboardShortcutsHelp = React.lazy(() => import('./components/help/KeyboardShortcutsHelp').then(module => ({
  default: module.KeyboardShortcutsHelp
})));

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
    toast.error(`App error: ${error.message}`);
  }

  render() {
    if ((this.state as any).hasError) {
      const error = (this.state as any).error;
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-gradient flex items-center justify-center p-4 text-gray-900 dark:text-white transition-colors duration-200">
          <div className="text-center p-8 max-w-2xl">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Something went wrong</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">The application encountered an error:</p>
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 text-left">
                <p className="text-red-400 font-mono text-sm break-all">{error.message}</p>
                {error.stack && (
                  <details className="mt-2">
                    <summary className="text-gray-400 cursor-pointer text-sm">Stack trace</summary>
                    <pre className="text-xs text-gray-500 mt-2 overflow-auto max-h-32">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()}
                className="btn-primary w-full sm:w-auto"
              >
                Refresh Page
              </button>
              <button 
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                }}
                className="btn-secondary w-full sm:w-auto sm:ml-3"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (this.props as any).children;
  }
}

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  const { connected, connecting, disconnecting } = useWallet();
  
  // Performance monitoring
  useComponentPerformance('AppContent');
  useMemoryPerformance(10000); // Check memory every 10 seconds
  useBundlePerformance();
  
  // Initialize mobile viewport height
  useMobileViewportHeight();
  
  // Initialize keyboard shortcuts
  const { shortcuts, showShortcutsHelp, setShowShortcutsHelp } = useGlobalKeyboardShortcuts();
  
  // Initialize real-time updates
  const { connectionState } = useRealTimeUpdates({
    onNFTListed: (nft) => console.log('NFT listed:', nft),
    onNFTSold: (nft) => console.log('NFT sold:', nft),
    onPriceChange: (change) => console.log('Price change:', change),
  });
  
  // Initialize accessibility features
  const skipNavigationId = useSkipNavigation();
  const { announceToScreenReader } = useAriaLive();
  
  // Initialize performance monitoring and event listeners
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      detectSlowRenders(16); // Detect renders slower than 16ms (60fps)
    }
    
    // Handle navigation events from keyboard shortcuts
    const handleNavigation = (event: CustomEvent) => {
      const view = event.detail;
      setCurrentView(view);
      announceToScreenReader(`Navigated to ${view}`);
    };
    
    // Handle other custom events
    const handleTogglePerformanceDashboard = () => {
      setShowPerformanceDashboard(prev => !prev);
    };
    
    const handleRefreshData = () => {
      // Trigger data refresh - this would normally call marketplace context refresh
      console.log('Refreshing marketplace data...');
    };
    
    // Add event listeners
    window.addEventListener('navigate', handleNavigation as EventListener);
    window.addEventListener('toggle-performance-dashboard', handleTogglePerformanceDashboard);
    window.addEventListener('refresh-data', handleRefreshData);
    
    return () => {
      window.removeEventListener('navigate', handleNavigation as EventListener);
      window.removeEventListener('toggle-performance-dashboard', handleTogglePerformanceDashboard);
      window.removeEventListener('refresh-data', handleRefreshData);
    };
  }, [announceToScreenReader]);

  // Debug wallet connection state
  useEffect(() => {
    console.log('Wallet state changed:', { connected, connecting, disconnecting });
    if (connecting) {
      console.log('Wallet is connecting...');
    }
    if (connected) {
      console.log('Wallet connected successfully');
    }
  }, [connected, connecting, disconnecting]);

  const renderCurrentView = () => {
    const fallback = (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );

    return (
      <React.Suspense fallback={fallback}>
        {(() => {
          switch (currentView) {
            case 'dashboard':
              return <Dashboard onViewChange={setCurrentView} />;
            case 'explore':
            case 'trending':
              return <Explore onViewChange={setCurrentView} />;
            case 'my-nfts':
            case 'my-listings':
            case 'portfolio':
              return <Portfolio onViewChange={setCurrentView} />;
            case 'favorites':
              return <Favorites onViewChange={setCurrentView} />;
            case 'admin':
            case 'settings':
              return <AdminPanel onViewChange={setCurrentView} />;
            default:
              return <Dashboard onViewChange={setCurrentView} />;
          }
        })()}
      </React.Suspense>
    );
  };

  // Show loading state during wallet connection
  if (connecting) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-gradient flex items-center justify-center text-gray-900 dark:text-white transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-900 dark:text-white text-lg">Connecting wallet...</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-gradient text-gray-900 dark:text-white transition-colors duration-200 mobile-safe-area">
      {/* Skip navigation link for accessibility */}
      <a
        href={`#${skipNavigationId}`}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary-600 text-white px-4 py-2 rounded-md"
      >
        Skip to main content
      </a>
      
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        
        <main id={skipNavigationId} className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderCurrentView()}
          </div>
        </main>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            borderRadius: '12px',
            border: '1px solid var(--border-secondary)',
            boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.1), 0 4px 6px -2px rgba(99, 102, 241, 0.05)',
          },
          success: {
            iconTheme: {
              primary: '#6366f1',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Keyboard Shortcuts Help Dialog */}
      <React.Suspense fallback={null}>
        <KeyboardShortcutsHelp
          isOpen={showShortcutsHelp}
          onClose={() => setShowShortcutsHelp(false)}
          shortcuts={shortcuts}
        />
      </React.Suspense>

      {/* Development Performance Dashboard */}
      {process.env.NODE_ENV === 'development' && (
        <React.Suspense fallback={null}>
          <PerformanceDashboard
            isOpen={showPerformanceDashboard}
            onClose={() => setShowPerformanceDashboard(false)}
          />
        </React.Suspense>
      )}
      
      {/* Real-time connection status indicator */}
      {connectionState !== 'connected' && (
        <div className="fixed bottom-4 left-4 bg-dark-800 border border-yellow-500/30 rounded-lg px-3 py-2 text-sm z-40">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              connectionState === 'error' ? 'bg-red-500' : 'bg-gray-500'
            }`} />
            <span className="text-gray-300">
              {connectionState === 'connecting' ? 'Connecting...' :
               connectionState === 'error' ? 'Connection error' : 'Disconnected'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <WalletContextProvider>
            <MarketplaceProvider>
              <FavoritesProvider>
                <AppContent />
                {/* Show React Query DevTools in development */}
                {process.env.NODE_ENV === 'development' && (
                  <ReactQueryDevtools initialIsOpen={false} />
                )}
              </FavoritesProvider>
            </MarketplaceProvider>
          </WalletContextProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;