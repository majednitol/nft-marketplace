/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eeebff',
          100: '#dcd7fe',
          200: '#beb3fd',
          300: '#9682fa',
          400: '#704cf4',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1a1b4b',
        },
        dark: {
          100: '#262438',
          200: '#1b192b',
          300: '#12101e',
          400: '#0a0914',
          500: '#06050b',
          600: '#040307',
          700: '#020204',
          800: '#010102',
          900: '#000000',
        },
        accent: {
          purple: '#8b5cf6',
          pink: '#d946ef',
          blue: '#3b82f6',
        },
        gray: {
          50: '#f8f8fc',
          100: '#f1f1f7',
          200: '#e4e4f0',
          300: '#d1d1e6',
          400: '#a3a3c2',
          500: '#737399',
          600: '#525270',
          700: '#3c3c52',
          800: '#222230',
          900: '#13131c',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'purple-gradient': 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        'dark-gradient': 'linear-gradient(135deg, #0b0914 0%, #030307 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px #6366f1' },
          '50%': { boxShadow: '0 0 20px #6366f1, 0 0 30px #6366f1' },
        },
      },
    },
  },
  plugins: [],
};
