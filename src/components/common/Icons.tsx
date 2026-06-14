import React from 'react';

// Common icon properties compatible with Lucide icon usages
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export type LucideIcon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;
export type LucideProps = IconProps;

// Helper to wrap custom Two-Tone Iconsax SVGs
const createIcon = (
  displayName: string,
  paths: (props: IconProps) => React.ReactNode
) => {
  const Component = React.forwardRef<SVGSVGElement, IconProps>(
    ({ size = 24, className = '', strokeWidth = 1.5, ...props }, ref) => {
      return (
        <svg
          ref={ref}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`iconsax iconsax-${displayName.toLowerCase()} ${className}`}
          {...props}
        >
          {paths({ strokeWidth, ...props })}
        </svg>
      );
    }
  );
  Component.displayName = displayName;
  return Component as LucideIcon;
};

// --- ICON DEFINITIONS ---

export const Home = createIcon('Home', () => (
  <>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" strokeOpacity={0.4} />
  </>
));

export const Settings = createIcon('Settings', () => (
  <>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    <circle cx="12" cy="12" r="3" strokeOpacity={0.4} />
  </>
));

export const Shield = createIcon('Shield', () => (
  <>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 6v10" strokeOpacity={0.4} />
  </>
));

export const Search = createIcon('Search', () => (
  <>
    <circle cx="11.5" cy="11.5" r="7.5" />
    <line x1="22" y1="22" x2="16.8" y2="16.8" strokeOpacity={0.4} />
  </>
));

export const Heart = createIcon('Heart', () => (
  <>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    <path d="M12 5.5a2.5 2.5 0 011.5.8" strokeOpacity={0.4} />
  </>
));

export const Users = createIcon('Users', () => (
  <>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" strokeOpacity={0.4} />
    <path d="M16 3.13a4 4 0 010 7.75" strokeOpacity={0.4} />
  </>
));

export const ShoppingBag = createIcon('ShoppingBag', () => (
  <>
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6z" />
    <line x1="3" y1="6" x2="21" y2="6" strokeOpacity={0.4} />
    <path d="M16 10a4 4 0 01-8 0" strokeOpacity={0.4} />
  </>
));

export const DollarSign = createIcon('DollarSign', () => (
  <>
    <path d="M12 1v22" strokeOpacity={0.4} />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </>
));

export const Star = createIcon('Star', () => (
  <>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    <circle cx="12" cy="11.5" r="1.5" strokeOpacity={0.4} />
  </>
));

export const TrendingUp = createIcon('TrendingUp', () => (
  <>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" strokeOpacity={0.4} />
  </>
));

export const Menu = createIcon('Menu', () => (
  <>
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" strokeOpacity={0.4} />
    <line x1="3" y1="18" x2="17" y2="18" strokeOpacity={0.4} />
  </>
));

export const Bell = createIcon('Bell', () => (
  <>
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z" />
    <path d="M13.73 21a2 2 0 01-3.46 0" strokeOpacity={0.4} />
  </>
));

export const User = createIcon('User', () => (
  <>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" strokeOpacity={0.4} />
  </>
));

export const X = createIcon('X', () => (
  <>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" strokeOpacity={0.4} />
  </>
));

export const Check = createIcon('Check', () => (
  <>
    <polyline points="20 6 9 17 4 12" />
    <circle cx="15" cy="8" r="1" strokeOpacity={0.4} />
  </>
));

export const ChevronDown = createIcon('ChevronDown', () => (
  <>
    <polyline points="6 9 12 15 18 9" />
    <line x1="12" y1="12" x2="12" y2="14" strokeOpacity={0.4} />
  </>
));

export const ChevronUp = createIcon('ChevronUp', () => (
  <>
    <polyline points="18 15 12 9 6 15" />
    <line x1="12" y1="12" x2="12" y2="10" strokeOpacity={0.4} />
  </>
));

export const ChevronLeft = createIcon('ChevronLeft', () => (
  <>
    <polyline points="15 18 9 12 15 6" />
  </>
));

export const ChevronRight = createIcon('ChevronRight', () => (
  <>
    <polyline points="9 18 15 12 9 6" />
  </>
));

export const ArrowLeft = createIcon('ArrowLeft', () => (
  <>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" strokeOpacity={0.4} />
  </>
));

export const ArrowRight = createIcon('ArrowRight', () => (
  <>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" strokeOpacity={0.4} />
  </>
));

export const Filter = createIcon('Filter', () => (
  <>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    <line x1="7" y1="3" x2="17" y2="3" strokeOpacity={0.4} />
  </>
));

export const SlidersHorizontal = createIcon('SlidersHorizontal', () => (
  <>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="3" y1="6" x2="4" y2="6" strokeOpacity={0.4} />
    <circle cx="6" cy="6" r="2" />
    <line x1="18" y1="12" x2="21" y2="12" />
    <line x1="3" y1="12" x2="14" y2="12" strokeOpacity={0.4} />
    <circle cx="16" cy="12" r="2" />
    <line x1="12" y1="18" x2="21" y2="18" />
    <line x1="3" y1="18" x2="8" y2="18" strokeOpacity={0.4} />
    <circle cx="10" cy="18" r="2" />
  </>
));

export const Grid = createIcon('Grid', () => (
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" strokeOpacity={0.4} />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" strokeOpacity={0.4} />
  </>
));

export const List = createIcon('List', () => (
  <>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" strokeOpacity={0.4} strokeWidth={3} />
    <line x1="3" y1="12" x2="3.01" y2="12" strokeOpacity={0.4} strokeWidth={3} />
    <line x1="3" y1="18" x2="3.01" y2="18" strokeOpacity={0.4} strokeWidth={3} />
  </>
));

export const Trash2 = createIcon('Trash2', () => (
  <>
    <polyline points="3 6 5 6 21 6" strokeOpacity={0.4} />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </>
));

export const Eye = createIcon('Eye', () => (
  <>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" strokeOpacity={0.4} />
  </>
));

export const Clock = createIcon('Clock', () => (
  <>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" strokeOpacity={0.4} />
  </>
));

export const Zap = createIcon('Zap', () => (
  <>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    <line x1="12" y1="10" x2="13" y2="14" strokeOpacity={0.4} />
  </>
));

export const AlertCircle = createIcon('AlertCircle', () => (
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" strokeOpacity={0.4} />
    <line x1="12" y1="16" x2="12.01" y2="16" strokeOpacity={0.4} />
  </>
));

export const XCircle = createIcon('XCircle', () => (
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" strokeOpacity={0.4} />
    <line x1="9" y1="9" x2="15" y2="15" strokeOpacity={0.4} />
  </>
));

export const CheckCircle = createIcon('CheckCircle', () => (
  <>
    <circle cx="12" cy="12" r="10" strokeOpacity={0.4} />
    <polyline points="22 4 12 14.01 9 11.01" />
  </>
));

export const Info = createIcon('Info', () => (
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" strokeOpacity={0.4} />
    <line x1="12" y1="8" x2="12.01" y2="8" strokeOpacity={0.4} />
  </>
));

export const Keyboard = createIcon('Keyboard', () => (
  <>
    <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
    <line x1="6" y1="8" x2="6.01" y2="8" strokeOpacity={0.4} strokeWidth={2} />
    <line x1="10" y1="8" x2="10.01" y2="8" strokeOpacity={0.4} strokeWidth={2} />
    <line x1="14" y1="8" x2="14.01" y2="8" strokeOpacity={0.4} strokeWidth={2} />
    <line x1="18" y1="8" x2="18.01" y2="8" strokeOpacity={0.4} strokeWidth={2} />
    <line x1="6" y1="12" x2="6.01" y2="12" strokeOpacity={0.4} strokeWidth={2} />
    <line x1="18" y1="12" x2="18.01" y2="12" strokeOpacity={0.4} strokeWidth={2} />
    <line x1="7" y1="16" x2="17" y2="16" strokeOpacity={0.4} />
  </>
));

export const Command = createIcon('Command', () => (
  <>
    <path d="M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z" />
    <path d="M15 6v12M9 6v12" strokeOpacity={0.4} />
  </>
));

export const Navigation = createIcon('Navigation', () => (
  <>
    <polygon points="3 11 22 2 13 21 11 13 3 11" />
    <line x1="11" y1="13" x2="22" y2="2" strokeOpacity={0.4} />
  </>
));

export const HelpCircle = createIcon('HelpCircle', () => (
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" strokeOpacity={0.4} />
    <line x1="12" y1="17" x2="12.01" y2="17" strokeOpacity={0.4} />
  </>
));

export const Activity = createIcon('Activity', () => (
  <>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    <circle cx="18" cy="12" r="1" strokeOpacity={0.4} />
    <circle cx="6" cy="12" r="1" strokeOpacity={0.4} />
  </>
));

export const BarChart3 = createIcon('BarChart3', () => (
  <>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="3" y1="20" x2="21" y2="20" strokeOpacity={0.4} />
  </>
));

export const Move = createIcon('Move', () => (
  <>
    <polyline points="5 9 2 12 5 15" />
    <polyline points="9 5 12 2 15 5" />
    <polyline points="15 19 12 22 9 19" />
    <polyline points="19 9 22 12 19 15" />
    <line x1="2" y1="12" x2="22" y2="12" strokeOpacity={0.4} />
    <line x1="12" y1="2" x2="12" y2="22" strokeOpacity={0.4} />
  </>
));

export const Bookmark = createIcon('Bookmark', () => (
  <>
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    <line x1="5" y1="6" x2="19" y2="6" strokeOpacity={0.4} />
  </>
));

export const Archive = createIcon('Archive', () => (
  <>
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" rx="1" />
    <line x1="10" y1="12" x2="14" y2="12" strokeOpacity={0.4} />
  </>
));

export const ShoppingCart = createIcon('ShoppingCart', () => (
  <>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" strokeOpacity={0.4} />
  </>
));

export const Calculator = createIcon('Calculator', () => (
  <>
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="2" strokeOpacity={0.4} />
    <line x1="15" y1="22" x2="15" y2="2" strokeOpacity={0.4} />
  </>
));

export const ExternalLink = createIcon('ExternalLink', () => (
  <>
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" strokeOpacity={0.4} />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </>
));

export const Copy = createIcon('Copy', () => (
  <>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeOpacity={0.4} />
  </>
));

export const Share2 = createIcon('Share2', () => (
  <>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" strokeOpacity={0.4} />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" strokeOpacity={0.4} />
  </>
));

export const Twitter = createIcon('Twitter', () => (
  <>
    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
    <path d="M8 13a3.5 3.5 0 013-3" strokeOpacity={0.4} />
  </>
));

export const MessageCircle = createIcon('MessageCircle', () => (
  <>
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    <circle cx="12" cy="12" r="1" strokeOpacity={0.4} strokeWidth={2} />
  </>
));

export const Link = createIcon('Link', () => (
  <>
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeOpacity={0.4} />
  </>
));

export const Sun = createIcon('Sun', () => (
  <>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" strokeOpacity={0.4} />
    <line x1="12" y1="21" x2="12" y2="23" strokeOpacity={0.4} />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" strokeOpacity={0.4} />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" strokeOpacity={0.4} />
    <line x1="1" y1="12" x2="3" y2="12" strokeOpacity={0.4} />
    <line x1="21" y1="12" x2="23" y2="12" strokeOpacity={0.4} />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" strokeOpacity={0.4} />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" strokeOpacity={0.4} />
  </>
));

export const Moon = createIcon('Moon', () => (
  <>
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    <circle cx="19" cy="6" r="1.5" strokeOpacity={0.4} strokeWidth={0} fill="currentColor" fillOpacity={0.4} />
  </>
));

export const Monitor = createIcon('Monitor', () => (
  <>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" strokeOpacity={0.4} />
    <line x1="12" y1="17" x2="12" y2="21" strokeOpacity={0.4} />
  </>
));

export const Tag = createIcon('Tag', () => (
  <>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" strokeOpacity={0.4} strokeWidth={2} />
  </>
));

export const Calendar = createIcon('Calendar', () => (
  <>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" strokeOpacity={0.4} />
    <line x1="8" y1="2" x2="8" y2="6" strokeOpacity={0.4} />
    <line x1="3" y1="10" x2="21" y2="10" strokeOpacity={0.4} />
  </>
));

// Special mock DivideIcon to satisfy StatsCard types
export const DivideIcon = createIcon('DivideIcon', () => (
  <>
    <circle cx="12" cy="6" r="2" />
    <line x1="5" y1="12" x2="19" y2="12" />
    <circle cx="12" cy="18" r="2" strokeOpacity={0.4} />
  </>
));

// --- NEWLY ADDED ICONS FOR SIDEBAR AND ADMIN PANEL ---

export const AlertTriangle = createIcon('AlertTriangle', () => (
  <>
    <polygon points="12 2 2 22 22 22 12 2" />
    <line x1="12" y1="9" x2="12" y2="13" strokeOpacity={0.4} />
    <line x1="12" y1="17" x2="12.01" y2="17" strokeOpacity={0.4} />
  </>
));

export const Ban = createIcon('Ban', () => (
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" strokeOpacity={0.4} />
  </>
));

export const RefreshCw = createIcon('RefreshCw', () => (
  <>
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" strokeOpacity={0.4} />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10" />
    <path d="M20.49 15a9 9 0 01-14.85 3.36L1 14" strokeOpacity={0.4} />
  </>
));

export const Download = createIcon('Download', () => (
  <>
    <path d="M19 12v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6" strokeOpacity={0.4} />
    <polyline points="8 17 12 21 16 17" />
    <line x1="12" y1="12" x2="12" y2="21" />
  </>
));

export const Crown = createIcon('Crown', () => (
  <>
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
    <line x1="5" y1="16" x2="19" y2="16" strokeOpacity={0.4} />
  </>
));

export const Database = createIcon('Database', () => (
  <>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5" strokeOpacity={0.4} />
    <path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
  </>
));

// --- PORTFOLIO & BULK ACTIONS ICONS ---

export const CheckSquare = createIcon('CheckSquare', () => (
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeOpacity={0.4} />
    <polyline points="9 11 12 14 22 4" />
  </>
));

export const Square = createIcon('Square', () => (
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <rect x="7" y="7" width="10" height="10" rx="1" strokeOpacity={0.4} />
  </>
));

export const Edit = createIcon('Edit', () => (
  <>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeOpacity={0.4} />
    <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
  </>
));

export const Send = createIcon('Send', () => (
  <>
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
    <line x1="11" y1="13" x2="22" y2="2" strokeOpacity={0.4} />
  </>
));

export const TrendingDown = createIcon('TrendingDown', () => (
  <>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" strokeOpacity={0.4} />
  </>
));

export const Wallet = createIcon('Wallet', () => (
  <>
    <path d="M20 12V8H6a2 2 0 012-2h12V4H8a4 4 0 00-4 4v8a4 4 0 004 4h12v-2a2 2 0 01-2-2H20z" />
    <path d="M20 12h2a1 1 0 011 1v2a1 1 0 01-1 1h-2v-4z" strokeOpacity={0.4} />
  </>
));

export const History = createIcon('History', () => (
  <>
    <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
    <polyline points="3 3 3 8 8 8" />
    <polyline points="12 7 12 12 16 14" strokeOpacity={0.4} />
  </>
));

// Export other common icons used to prevent build failures if imported
export const Sliders = SlidersHorizontal;
export const HelpOutline = HelpCircle;
export const HelpCenter = HelpCircle;
export const CrownIcon = Crown;
export const SettingsIcon = Settings;
export const HomeIcon = Home;
export const ShieldIcon = Shield;
export const UserIcon = User;
export const SearchIcon = Search;
export const HeartIcon = Heart;
export const StarIcon = Star;
export const ClockIcon = Clock;
export const TrashIcon = Trash2;
export const InfoIcon = Info;
export const EyeIcon = Eye;
export const ZapIcon = Zap;
export const BellIcon = Bell;
export const LinkIcon = Link;
export const CopyIcon = Copy;
export const XIcon = X;
export const MenuIcon = Menu;
export const ShoppingBagIcon = ShoppingBag;
export const UsersIcon = Users;
export const ActivityIcon = Activity;
export const BarChartIcon = BarChart3;
export const FilterIcon = Filter;
export const ListIcon = List;
export const GridIcon = Grid;
export const MoveIcon = Move;
export const BookmarkIcon = Bookmark;
export const ArchiveIcon = Archive;
export const ShoppingCartIcon = ShoppingCart;
export const ChevronDownIcon = ChevronDown;
export const ChevronUpIcon = ChevronUp;
export const ChevronLeftIcon = ChevronLeft;
export const ChevronRightIcon = ChevronRight;
export const ArrowLeftIcon = ArrowLeft;
export const ArrowRightIcon = ArrowRight;
export const CheckIcon = Check;
export const SunIcon = Sun;
export const MoonIcon = Moon;
export const MonitorIcon = Monitor;
export const TagIcon = Tag;
export const CalendarIcon = Calendar;
export const AlertTriangleIcon = AlertTriangle;
export const BanIcon = Ban;
export const RefreshCwIcon = RefreshCw;
export const DownloadIcon = Download;
export const DatabaseIcon = Database;
export const CalculatorIcon = Calculator;
export const ExternalLinkIcon = ExternalLink;
export const ShareIcon = Share2;
export const TwitterIcon = Twitter;
export const MessageCircleIcon = MessageCircle;
export const DivideIconComponent = DivideIcon;
export const CheckSquareIcon = CheckSquare;
export const SquareIcon = Square;
export const EditIcon = Edit;
export const SendIcon = Send;
export const TrendingDownIcon = TrendingDown;
export const WalletIcon = Wallet;
export const HistoryIcon = History;

// Custom additions for Minting
export const Plus = createIcon('Plus', () => (
  <>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </>
));

export const Loader2 = createIcon('Loader2', () => (
  <>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </>
));

export const Sparkles = createIcon('Sparkles', () => (
  <>
    <path d="M12 3v2M12 19v2M5 12H3M21 12h-2M18.36 5.64l-1.42 1.42M7.05 16.95l-1.42 1.42M18.36 18.36l-1.42-1.42M7.05 7.05L5.64 5.64" />
  </>
));

export const PlusIcon = Plus;
export const Loader2Icon = Loader2;
export const SparklesIcon = Sparkles;

export const Upload = createIcon('Upload', () => (
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeOpacity={0.4} />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </>
));

export const UploadIcon = Upload;

export const Music = createIcon('Music', () => (
  <>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" strokeOpacity={0.4} />
  </>
));

export const MusicIcon = Music;

export const Video = createIcon('Video', () => (
  <>
    <path d="m22 8-6 4 6 4V8Z" />
    <rect width="14" height="12" x="2" y="6" rx="2" ry="2" strokeOpacity={0.4} />
  </>
));

export const VideoIcon = Video;

export const Play = createIcon('Play', () => (
  <>
    <polygon points="6 3 20 12 6 21 6 3" />
  </>
));

export const PlayIcon = Play;

export const Pause = createIcon('Pause', () => (
  <>
    <rect x="14" y="4" width="4" height="16" rx="1" />
    <rect x="6" y="4" width="4" height="16" rx="1" strokeOpacity={0.4} />
  </>
));

export const PauseIcon = Pause;

export const Volume2 = createIcon('Volume2', () => (
  <>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" strokeOpacity={0.4} />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </>
));

export const Volume2Icon = Volume2;

export const VolumeX = createIcon('VolumeX', () => (
  <>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="22" y1="9" x2="16" y2="15" strokeOpacity={0.4} />
    <line x1="16" y1="9" x2="22" y2="15" strokeOpacity={0.4} />
  </>
));

export const VolumeXIcon = VolumeX;

