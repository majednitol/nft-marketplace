import React, { useMemo } from 'react';
import { X, Keyboard, Command, Search, Navigation, Zap, Eye, HelpCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { useKeyboardNavigation } from '../../hooks/useAccessibility';
import { KeyboardShortcut, formatShortcutDisplay } from '../../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Navigation: Navigation,
  Search: Search,
  Actions: Zap,
  View: Eye,
  Help: HelpCircle,
  Utility: Command,
  Development: Command,
};

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  shortcuts,
}) => {
  const dialogRef = useKeyboardNavigation({
    onEscape: onClose,
    trapFocus: isOpen,
    autoFocus: isOpen,
  });

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, KeyboardShortcut[]> = {};
    
    shortcuts.forEach(shortcut => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category].push(shortcut);
    });

    // Sort categories by importance
    const categoryOrder = ['Navigation', 'Search', 'Actions', 'View', 'Help', 'Utility', 'Development'];
    const orderedGroups: Record<string, KeyboardShortcut[]> = {};
    
    categoryOrder.forEach(category => {
      if (groups[category]) {
        orderedGroups[category] = groups[category];
      }
    });

    // Add any remaining categories
    Object.keys(groups).forEach(category => {
      if (!orderedGroups[category]) {
        orderedGroups[category] = groups[category];
      }
    });

    return orderedGroups;
  }, [shortcuts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={dialogRef}
        className="bg-dark-800 rounded-xl border border-primary-800/30 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
        role="dialog"
        aria-labelledby="shortcuts-title"
        aria-describedby="shortcuts-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-600">
          <div className="flex items-center space-x-3">
            <Keyboard className="h-6 w-6 text-primary-400" />
            <div>
              <h2 id="shortcuts-title" className="text-xl font-semibold text-white">
                Keyboard Shortcuts
              </h2>
              <p id="shortcuts-description" className="text-gray-400 text-sm">
                Speed up your workflow with these keyboard shortcuts
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close keyboard shortcuts help"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => {
              const IconComponent = categoryIcons[category] || Command;
              
              return (
                <div key={category} className="space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-dark-600">
                    <IconComponent className="h-5 w-5 text-primary-400" />
                    <h3 className="text-lg font-medium text-white">{category}</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div
                        key={`${category}-${index}`}
                        className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">
                            {shortcut.description}
                          </p>
                          {shortcut.disabled && (
                            <p className="text-gray-500 text-xs mt-1">
                              Currently disabled
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-4">
                          {formatShortcutDisplay(shortcut).split(' + ').map((key, keyIndex, keys) => (
                            <React.Fragment key={keyIndex}>
                              <kbd className="px-2 py-1 bg-dark-600 border border-dark-500 rounded text-xs font-mono text-gray-300 min-w-[2rem] text-center">
                                {key}
                              </kbd>
                              {keyIndex < keys.length - 1 && (
                                <span className="text-gray-500 text-xs">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tips */}
          <div className="mt-8 pt-6 border-t border-dark-600">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <HelpCircle className="h-5 w-5 text-primary-400 mr-2" />
              Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
              <div className="space-y-2">
                <p>• Shortcuts work globally unless you're typing in an input field</p>
                <p>• Use <kbd className="px-1 bg-dark-600 rounded text-xs">?</kbd> to open this help dialog anytime</p>
                <p>• Press <kbd className="px-1 bg-dark-600 rounded text-xs">Esc</kbd> to close dialogs and cancel actions</p>
              </div>
              <div className="space-y-2">
                <p>• Some shortcuts may vary between operating systems</p>
                <p>• You can disable shortcuts if they conflict with browser shortcuts</p>
                <p>• Shortcuts are disabled when typing in search or form fields</p>
              </div>
            </div>
          </div>

          {/* Platform-specific note */}
          <div className="mt-6 p-4 bg-primary-900/20 border border-primary-800/30 rounded-lg">
            <p className="text-primary-300 text-sm flex items-center">
              <Command className="h-4 w-4 mr-2" />
              {navigator.platform.includes('Mac') 
                ? 'On Mac, Ctrl shortcuts may also work with Cmd key'
                : 'Some shortcuts may require different modifier keys on different operating systems'
              }
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-dark-600 bg-dark-700/50">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              Press <kbd className="px-2 py-1 bg-dark-600 border border-dark-500 rounded text-xs">?</kbd> anytime to view shortcuts
            </p>
            <Button onClick={onClose} variant="primary">
              Got it!
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};