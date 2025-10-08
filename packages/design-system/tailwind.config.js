/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // COLORS - Semantic Design Tokens
      colors: {
        // Primary (Blue) - Material Design Blue 500
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#2196f3',
          600: '#1e88e5',
          700: '#1976d2',
          800: '#1565c0',
          900: '#0d47a1',
          DEFAULT: '#2196f3',
          foreground: '#ffffff',
        },

        // Success (Okabe-Ito colorblind-safe bluish green)
        success: {
          light: '#4caf50',
          DEFAULT: '#117733',
          dark: '#0d5e28',
          foreground: '#ffffff',
        },

        // Error (Okabe-Ito vermillion)
        error: {
          light: '#ef5350',
          DEFAULT: '#d55e00',
          dark: '#aa4a00',
          foreground: '#ffffff',
        },

        // Warning (Okabe-Ito orange)
        warning: {
          light: '#ffb74d',
          DEFAULT: '#e69f00',
          dark: '#b87f00',
          foreground: '#000000',
        },

        // Info (Okabe-Ito blue)
        info: {
          light: '#56b4e9',
          DEFAULT: '#0072b2',
          dark: '#004d80',
          foreground: '#ffffff',
        },

        // Neutral scale (comprehensive grayscale)
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#eeeeee',
          300: '#e0e0e0',
          400: '#bdbdbd',
          500: '#9e9e9e',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121',
          950: '#0a0a0a',
        },

        // Surface colors (semantic - use CSS variables)
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          container: 'hsl(var(--surface-container))',
          containerLow: 'hsl(var(--surface-container-low))',
          containerHigh: 'hsl(var(--surface-container-high))',
        },

        // Semantic backgrounds
        background: {
          DEFAULT: 'hsl(var(--background))',
          subtle: 'hsl(var(--background-subtle))',
        },

        foreground: {
          DEFAULT: 'hsl(var(--foreground))',
          muted: 'hsl(var(--foreground-muted))',
        },

        // Legacy color aliases (for backwards compatibility - mark for deprecation)
        'primary-blue': '#2196F3',
        'primary-white': '#FFFFFF',
        'primary-charcoal': '#1A1F2E',
        'secondary-blue-light': '#4A90E2',
        'secondary-blue-pale': '#E8F0FE',
        'secondary-gray': '#6B7280',
        'secondary-light-gray': '#F3F4F6',
        'accent-orange': '#FF6B35',
        'accent-green': '#22C55E',
        'accent-yellow': '#FFC107',
        'accent-red': '#EF4444',
        'neutral': '#888888',
        'background-white': '#FFFFFF',
        'background-light': '#F9FAFB',
        'background-offwhite': '#F5F7FA',
        'background-dark': '#111827',
      },

      // SPACING - Based on Design System Spec
      spacing: {
        'micro': '4px',
        'tiny': '8px',
        'small': '12px',
        'default': '16px',
        'medium': '20px',
        'large': '24px',
        'xl': '32px',
        'xxl': '40px',
        'xxxl': '48px',
      },

      // BORDER RADIUS
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
        'card': '12px',
        'button': '8px',
        'input': '8px',
        'modal': '16px',
        'fab': '28px',
      },

      // BOX SHADOWS
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'button': '0 2px 4px rgba(0, 71, 171, 0.2)',
        'button-hover': '0 4px 8px rgba(0, 71, 171, 0.3)',
        'nav': '0 -2px 10px rgba(0, 0, 0, 0.05)',
        'fab': '0 4px 12px rgba(0, 71, 171, 0.3)',
        'modal': '0 20px 60px rgba(0, 0, 0, 0.3)',
      },

      // TYPOGRAPHY
      fontSize: {
        // Headings
        'h1': ['32px', { lineHeight: '40px', letterSpacing: '-0.025em', fontWeight: '700' }],
        'h2': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'h3': ['24px', { lineHeight: '32px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'h4': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '500' }],
        'h5': ['18px', { lineHeight: '24px', letterSpacing: '0', fontWeight: '500' }],

        // Body
        'body-large': ['17px', { lineHeight: '24px', letterSpacing: '0' }],
        'body': ['15px', { lineHeight: '22px', letterSpacing: '0' }],
        'body-small': ['13px', { lineHeight: '18px', letterSpacing: '0.01em' }],

        // Special
        'caption': ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '500' }],
        'button-text': ['16px', { lineHeight: '24px', letterSpacing: '0.01em', fontWeight: '500' }],
        'data-text': ['14px', { lineHeight: '20px', letterSpacing: '0' }],
      },

      // HEIGHTS
      height: {
        'button-mobile': '48px',
        'button-desktop': '40px',
        'input-mobile': '56px',
        'input-desktop': '48px',
        'nav-bottom': '64px',
        'nav-top': '64px',
        'fab': '56px',
      },

      // WIDTHS
      width: {
        'fab': '56px',
      },

      // ANIMATION DURATIONS
      transitionDuration: {
        'micro': '100ms',
        'fast': '150ms',
        'standard': '200ms',
        'slow': '300ms',
      },

      // Z-INDEX
      zIndex: {
        'dropdown': '10',
        'sticky': '20',
        'nav': '30',
        'modal': '40',
        'toast': '50',
      },

      // KEYFRAMES for animations
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
