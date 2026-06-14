import React from 'react';

// Mobile-optimized button component
interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export function MobileButton({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '',
  ...props 
}: MobileButtonProps) {
  const baseClasses = 'tap-highlight-none touch-action-manipulation active:scale-95 transition-transform duration-100';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary'
  };
  const sizeClasses = {
    sm: 'min-h-[36px] px-3 py-2 text-sm',
    md: 'min-h-[44px] px-4 py-3 text-base',
    lg: 'min-h-[48px] px-6 py-4 text-lg'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Mobile-optimized input component
interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function MobileInput({ 
  label, 
  error, 
  className = '', 
  ...props 
}: MobileInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300 px-1">
          {label}
        </label>
      )}
      <input
        className={`input-primary min-h-[44px] text-base ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-red-400 text-sm px-1">{error}</p>
      )}
    </div>
  );
}

// Mobile-optimized card component
interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export function MobileCard({ 
  children, 
  className = '', 
  padding = 'md', 
  interactive = false 
}: MobileCardProps) {
  const baseClasses = 'card';
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };
  const interactiveClasses = interactive 
    ? 'tap-highlight-none touch-action-manipulation active:scale-98 transition-transform duration-100' 
    : '';

  return (
    <div className={`${baseClasses} ${paddingClasses[padding]} ${interactiveClasses} ${className}`}>
      {children}
    </div>
  );
}

// Mobile-optimized modal component
interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  fullScreen?: boolean;
}

export function MobileModal({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  fullScreen = false 
}: MobileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm touch-action-pan-y" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-md mx-4 mb-4 sm:mb-0 ${
        fullScreen 
          ? 'h-full sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl' 
          : 'max-h-[90vh] rounded-2xl'
      }`}>
        <div className="card p-0 overflow-hidden">
          {title && (
            <div className="flex items-center justify-between p-4 border-b border-primary-800/30">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-dark-300/50 rounded-lg transition-colors tap-highlight-none"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className={`${fullScreen ? 'flex-1 overflow-y-auto' : ''}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile-optimized tab component
interface MobileTabsProps {
  tabs: Array<{ id: string; label: string; icon?: React.ComponentType<any> }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function MobileTabs({ tabs, activeTab, onTabChange }: MobileTabsProps) {
  return (
    <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-primary-600 scrollbar-track-dark-400 pb-2">
      <div className="flex space-x-1 min-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-colors tap-highlight-none ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-gray-300 hover:bg-dark-300/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              {tab.icon && <tab.icon className="h-4 w-4" />}
              <span className="whitespace-nowrap">{tab.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Mobile-optimized grid component
interface MobileGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MobileGrid({ 
  children, 
  columns = 2, 
  gap = 'md', 
  className = '' 
}: MobileGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  };
  
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };

  return (
    <div className={`grid ${gridClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

// Hook for detecting mobile device
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
}

// Hook for managing mobile viewport height
export function useMobileViewportHeight() {
  React.useEffect(() => {
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);
}