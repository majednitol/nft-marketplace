import React, { useEffect, useRef, useCallback, useState } from 'react';

// Hook for managing focus visibility
export const useFocusVisible = () => {
  const [focusVisible, setFocusVisible] = useState(false);
  const hadKeyboardEvent = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.altKey || e.ctrlKey) return;
      hadKeyboardEvent.current = true;
    };

    const handlePointerDown = () => {
      hadKeyboardEvent.current = false;
    };

    const handleFocus = () => {
      if (hadKeyboardEvent.current) {
        setFocusVisible(true);
      }
    };

    const handleBlur = () => {
      setFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  return focusVisible;
};

// Hook for keyboard navigation
export const useKeyboardNavigation = (options: {
  onEscape?: () => void;
  onEnter?: () => void;
  trapFocus?: boolean;
  autoFocus?: boolean;
}) => {
  const { onEscape, onEnter, trapFocus = false, autoFocus = false } = options;
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (onEscape) {
            e.preventDefault();
            onEscape();
          }
          break;
        case 'Enter':
        case ' ':
          if (onEnter && e.target === containerRef.current) {
            e.preventDefault();
            onEnter();
          }
          break;
        case 'Tab':
          if (trapFocus && containerRef.current) {
            handleFocusTrap(e);
          }
          break;
      }
    };

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (!containerRef.current) return;

      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Auto focus first focusable element
    if (autoFocus && containerRef.current) {
      const firstFocusable = containerRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onEscape, onEnter, trapFocus, autoFocus]);

  return containerRef;
};

// Hook for managing aria-live regions
export const useAriaLive = () => {
  const [announcement, setAnnouncement] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setAnnouncement('');
    
    timeoutRef.current = setTimeout(() => {
      setAnnouncement(message);
      
      // Clear after announcement
      timeoutRef.current = setTimeout(() => {
        setAnnouncement('');
      }, 1000);
    }, 100);
  }, []);

  const LiveRegion = useCallback(({ priority = 'polite' }: { priority?: 'polite' | 'assertive' }) => (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  ), [announcement]);

  return { announce, LiveRegion };
};

// Hook for skip navigation
export const useSkipNavigation = () => {
  const [showSkipLinks, setShowSkipLinks] = useState(false);

  const SkipNavigation = useCallback(() => (
    <div className={`skip-navigation ${showSkipLinks ? 'visible' : ''}`}>
      <a
        href="#main-content"
        className="skip-link"
        onFocus={() => setShowSkipLinks(true)}
        onBlur={() => setShowSkipLinks(false)}
      >
        Skip to main content
      </a>
      <a
        href="#sidebar-navigation"
        className="skip-link"
        onFocus={() => setShowSkipLinks(true)}
        onBlur={() => setShowSkipLinks(false)}
      >
        Skip to navigation
      </a>
    </div>
  ), [showSkipLinks]);

  return { SkipNavigation };
};

// Hook for reduced motion preferences
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// Hook for high contrast mode
export const useHighContrast = () => {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
};

// Hook for screen reader detection
export const useScreenReader = () => {
  const [isScreenReader, setIsScreenReader] = useState(false);

  useEffect(() => {
    // Detect if user is likely using a screen reader
    const checkScreenReader = () => {
      // Check for reduced motion preference (common with screen readers)
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      // Check for specific screen reader user agents
      const userAgent = navigator.userAgent.toLowerCase();
      const screenReaderIndicators = ['nvda', 'jaws', 'narrator', 'voiceover'];
      const hasScreenReaderUA = screenReaderIndicators.some(indicator => 
        userAgent.includes(indicator)
      );

      setIsScreenReader(prefersReducedMotion || hasScreenReaderUA);
    };

    checkScreenReader();

    // Listen for accessibility API usage
    const handleFocusChange = () => {
      if (document.activeElement?.getAttribute('aria-describedby') || 
          document.activeElement?.getAttribute('aria-labelledby')) {
        setIsScreenReader(true);
      }
    };

    document.addEventListener('focusin', handleFocusChange);
    return () => document.removeEventListener('focusin', handleFocusChange);
  }, []);

  return isScreenReader;
};

// Hook for managing aria-expanded states
export const useAriaExpanded = (initialState = false) => {
  const [isExpanded, setIsExpanded] = useState(initialState);

  const toggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const expand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return {
    isExpanded,
    toggle,
    expand,
    collapse,
    ariaExpanded: isExpanded.toString(),
  };
};