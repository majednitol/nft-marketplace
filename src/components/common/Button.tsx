import React, { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { clsx } from 'clsx';
import { LoadingSpinner } from './LoadingSpinner';
import { useFocusVisible } from '../../hooks/useAccessibility';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
  'aria-pressed'?: boolean;
  'aria-expanded'?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  'aria-describedby': ariaDescribedBy,
  'aria-labelledby': ariaLabelledBy,
  'aria-pressed': ariaPressed,
  'aria-expanded': ariaExpanded,
  ...props
}, ref) => {
  const focusVisible = useFocusVisible();
  
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none relative';
  const focusClasses = focusVisible ? 'focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-500' : '';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl hover:shadow-primary-500/30',
    secondary: 'bg-dark-400 text-gray-200 hover:bg-dark-300 border border-primary-800/30 hover:border-primary-600/50',
    outline: 'border-2 border-primary-600 text-primary-400 hover:bg-primary-600/10 hover:text-primary-300',
    ghost: 'text-primary-400 hover:bg-dark-300/50 hover:text-primary-300',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const isDisabled = disabled || loading;
  
  return (
    <button
      ref={ref}
      className={clsx(
        baseClasses,
        focusClasses,
        variantClasses[variant],
        sizeClasses[size],
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={isDisabled}
      aria-describedby={ariaDescribedBy}
      aria-labelledby={ariaLabelledBy}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <>
          <LoadingSpinner size="sm" className="mr-2" />
          <span className="sr-only">Loading...</span>
        </>
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';