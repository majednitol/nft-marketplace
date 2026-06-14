import { useEffect, useCallback, useRef, useState } from 'react';
import { enhancedToast } from '../components/notifications/EnhancedToast';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category: string;
  disabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enableGlobal?: boolean;
  preventDefault?: boolean;
  showNotifications?: boolean;
}

export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const {
    enableGlobal = true,
    preventDefault = true,
    showNotifications = false,
  } = options;

  const [isEnabled, setIsEnabled] = useState(true);
  const shortcutsRef = useRef<KeyboardShortcut[]>(shortcuts);
  const lastTriggeredRef = useRef<string>('');

  // Update shortcuts ref when shortcuts change
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;

    // Don't trigger shortcuts when user is typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const matchedShortcut = shortcutsRef.current.find(shortcut => {
      if (shortcut.disabled) return false;

      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
      const altMatches = !!shortcut.altKey === event.altKey;
      const metaMatches = !!shortcut.metaKey === event.metaKey;

      return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
    });

    if (matchedShortcut) {
      if (preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Prevent rapid triggering of the same shortcut
      const shortcutId = `${matchedShortcut.key}-${matchedShortcut.ctrlKey}-${matchedShortcut.shiftKey}`;
      if (lastTriggeredRef.current === shortcutId) {
        return;
      }
      lastTriggeredRef.current = shortcutId;

      // Clear the throttle after a short delay
      setTimeout(() => {
        lastTriggeredRef.current = '';
      }, 200);

      matchedShortcut.action();

      if (showNotifications) {
        enhancedToast.info('Keyboard Shortcut', {
          message: matchedShortcut.description,
          duration: 2000,
        });
      }
    }
  }, [isEnabled, preventDefault, showNotifications]);

  useEffect(() => {
    if (enableGlobal) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enableGlobal, handleKeyDown]);

  const toggleEnabled = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  const enable = useCallback(() => {
    setIsEnabled(true);
  }, []);

  const disable = useCallback(() => {
    setIsEnabled(false);
  }, []);

  return {
    isEnabled,
    toggleEnabled,
    enable,
    disable,
  };
};

// Global keyboard shortcuts hook for the entire app
export const useGlobalKeyboardShortcuts = () => {
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: '1',
      altKey: true,
      action: () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' })),
      description: 'Go to Dashboard',
      category: 'Navigation',
    },
    {
      key: '2',
      altKey: true,
      action: () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'explore' })),
      description: 'Go to Explore',
      category: 'Navigation',
    },
    {
      key: '3',
      altKey: true,
      action: () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'portfolio' })),
      description: 'Go to Portfolio',
      category: 'Navigation',
    },
    {
      key: '4',
      altKey: true,
      action: () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'favorites' })),
      description: 'Go to Favorites',
      category: 'Navigation',
    },
    
    // Search shortcuts
    {
      key: 'k',
      ctrlKey: true,
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: 'Focus search input',
      category: 'Search',
    },
    {
      key: 'f',
      ctrlKey: true,
      shiftKey: true,
      action: () => window.dispatchEvent(new CustomEvent('toggle-advanced-search')),
      description: 'Toggle advanced search filters',
      category: 'Search',
    },

    // Actions shortcuts
    {
      key: 'n',
      ctrlKey: true,
      action: () => window.dispatchEvent(new CustomEvent('create-listing')),
      description: 'Create new NFT listing',
      category: 'Actions',
    },
    {
      key: 'r',
      ctrlKey: true,
      action: () => {
        window.dispatchEvent(new CustomEvent('refresh-data'));
        enhancedToast.info('Refreshing data...', { duration: 2000 });
      },
      description: 'Refresh marketplace data',
      category: 'Actions',
    },

    // View shortcuts
    {
      key: 'g',
      action: () => window.dispatchEvent(new CustomEvent('toggle-grid-view')),
      description: 'Toggle grid view',
      category: 'View',
    },
    {
      key: 'd',
      altKey: true,
      action: () => window.dispatchEvent(new CustomEvent('toggle-dark-mode')),
      description: 'Toggle dark mode',
      category: 'View',
    },

    // Utility shortcuts
    {
      key: '?',
      action: () => setShowShortcutsHelp(true),
      description: 'Show keyboard shortcuts help',
      category: 'Help',
    },
    {
      key: 'Escape',
      action: () => {
        // Close any open modals or dropdowns
        window.dispatchEvent(new CustomEvent('close-modals'));
        setShowShortcutsHelp(false);
      },
      description: 'Close modals and cancel actions',
      category: 'Utility',
    },

    // Development shortcuts (only in development)
    ...(process.env.NODE_ENV === 'development' ? [
      {
        key: 'p',
        ctrlKey: true,
        shiftKey: true,
        action: () => window.dispatchEvent(new CustomEvent('toggle-performance-dashboard')),
        description: 'Toggle performance dashboard',
        category: 'Development',
      },
    ] : []),
  ];

  const { isEnabled, toggleEnabled, enable, disable } = useKeyboardShortcuts(shortcuts, {
    enableGlobal: true,
    preventDefault: true,
    showNotifications: false,
  });

  return {
    shortcuts,
    isEnabled,
    toggleEnabled,
    enable,
    disable,
    showShortcutsHelp,
    setShowShortcutsHelp,
  };
};

// Hook for component-specific shortcuts
export const useComponentShortcuts = (
  shortcuts: KeyboardShortcut[],
  enabled = true
) => {
  return useKeyboardShortcuts(shortcuts, {
    enableGlobal: enabled,
    preventDefault: true,
    showNotifications: false,
  });
};

// Utility function to format shortcut display
export const formatShortcutDisplay = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.metaKey) parts.push(navigator.platform.includes('Mac') ? 'Cmd' : 'Meta');
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(' + ');
};

// Utility function to check if shortcut conflicts exist
export const findShortcutConflicts = (shortcuts: KeyboardShortcut[]): KeyboardShortcut[][] => {
  const conflicts: KeyboardShortcut[][] = [];
  
  for (let i = 0; i < shortcuts.length; i++) {
    for (let j = i + 1; j < shortcuts.length; j++) {
      const a = shortcuts[i];
      const b = shortcuts[j];
      
      if (
        a.key.toLowerCase() === b.key.toLowerCase() &&
        !!a.ctrlKey === !!b.ctrlKey &&
        !!a.shiftKey === !!b.shiftKey &&
        !!a.altKey === !!b.altKey &&
        !!a.metaKey === !!b.metaKey
      ) {
        conflicts.push([a, b]);
      }
    }
  }
  
  return conflicts;
};