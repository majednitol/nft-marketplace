import React, { useState } from 'react';
import { Sun, Moon, Monitor, Check, ChevronDown } from 'lucide-react';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';
import { useKeyboardNavigation, useAriaExpanded } from '../../hooks/useAccessibility';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    icon: Sun,
    description: 'Always use light theme',
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: Moon,
    description: 'Always use dark theme',
  },
  {
    value: 'system',
    label: 'System',
    icon: Monitor,
    description: 'Follow system preference',
  },
];

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'button',
  showLabel = false,
  size = 'md',
}) => {
  const { theme, setTheme, toggleTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const { isExpanded, toggle, ariaExpanded } = useAriaExpanded(isOpen);

  const dropdownRef = useKeyboardNavigation({
    onEscape: () => setIsOpen(false),
    trapFocus: isOpen,
  });

  const currentOption = themeOptions.find(option => option.value === theme) || themeOptions[2];
  const CurrentIcon = currentOption.icon;

  // Simple toggle button (cycles through themes)
  if (variant === 'button') {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={toggleTheme}
        aria-label={`Current theme: ${currentOption.label}. Click to toggle theme.`}
        title={`Switch theme (currently ${currentOption.label})`}
        className="relative group"
      >
        <div className="relative">
          <CurrentIcon className={`
            transition-all duration-300 
            ${size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'}
            ${resolvedTheme === 'dark' ? 'text-yellow-400' : 'text-blue-500'}
          `} />
          
          {/* Animated background for visual feedback */}
          <div className={`
            absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity
            ${resolvedTheme === 'dark' ? 'bg-yellow-400' : 'bg-blue-500'}
          `} />
        </div>
        
        {showLabel && (
          <span className="ml-2 text-sm">
            {currentOption.label}
          </span>
        )}
      </Button>
    );
  }

  // Dropdown variant
  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size={size}
        onClick={() => {
          setIsOpen(!isOpen);
          toggle();
        }}
        aria-expanded={ariaExpanded}
        aria-haspopup="listbox"
        aria-label="Select theme"
        className="flex items-center space-x-2"
      >
        <CurrentIcon className={`
          transition-colors duration-200
          ${size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'}
          ${resolvedTheme === 'dark' ? 'text-yellow-400' : 'text-blue-500'}
        `} />
        
        {showLabel && (
          <span className="text-sm">
            {currentOption.label}
          </span>
        )}
        
        <ChevronDown className={`
          h-4 w-4 text-gray-400 transition-transform duration-200
          ${isOpen ? 'rotate-180' : ''}
        `} />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 bg-dark-700 border border-primary-800/30 rounded-xl shadow-xl z-50 py-2"
          role="listbox"
          aria-label="Theme options"
        >
          {themeOptions.map((option) => {
            const OptionIcon = option.icon;
            const isSelected = theme === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value);
                  setIsOpen(false);
                }}
                role="option"
                aria-selected={isSelected}
                className={`
                  w-full px-4 py-3 text-left hover:bg-dark-600 transition-colors duration-200
                  flex items-center space-x-3 focus:outline-none focus:bg-dark-600
                  ${isSelected ? 'bg-primary-900/20' : ''}
                `}
              >
                <OptionIcon className={`
                  h-5 w-5 transition-colors duration-200
                  ${option.value === 'light' ? 'text-yellow-500' : 
                    option.value === 'dark' ? 'text-blue-400' : 'text-gray-400'}
                  ${isSelected ? 'text-primary-400' : ''}
                `} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`
                      text-sm font-medium transition-colors duration-200
                      ${isSelected ? 'text-primary-300' : 'text-white'}
                    `}>
                      {option.label}
                    </span>
                    
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary-400" />
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-1">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
          
          {/* Current system theme indicator */}
          <div className="px-4 py-2 mt-2 pt-4 border-t border-dark-600">
            <p className="text-xs text-gray-500">
              System preference: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
            </p>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

// Compact theme toggle for headers/toolbars
export const CompactThemeToggle: React.FC = () => {
  const { resolvedTheme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className={`
        p-2 rounded-lg transition-all duration-300 hover:scale-110
        ${resolvedTheme === 'dark' 
          ? 'bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20' 
          : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
        }
      `}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Currently using ${resolvedTheme} theme. Click to switch.`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
};

// Theme status indicator
export const ThemeStatusIndicator: React.FC = () => {
  const { theme, resolvedTheme, systemTheme } = useTheme();
  
  if (theme !== 'system') return null;
  
  return (
    <div className="flex items-center space-x-2 text-xs text-gray-500">
      <Monitor className="h-3 w-3" />
      <span>
        Following system ({systemTheme === 'dark' ? 'dark' : 'light'})
      </span>
    </div>
  );
};