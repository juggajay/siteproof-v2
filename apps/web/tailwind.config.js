/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/design-system/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // New Design System Colors
        primary: {
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#2196F3',
          600: '#1E88E5',
          700: '#1976D2',
          800: '#1565C0',
          900: '#0D47A1',
          DEFAULT: '#1E88E5',
          blue: '#1E88E5',
          charcoal: '#1F2937',
        },
        secondary: {
          gray: '#6B7280',
          'light-gray': '#F3F4F6',
          'blue-pale': '#E3F2FD',
        },
        success: {
          light: '#4CAF50',
          main: '#117733',
          dark: '#0D5E28',
          DEFAULT: '#117733',
        },
        error: {
          light: '#EF5350',
          main: '#D55E00',
          dark: '#AA4A00',
          DEFAULT: '#D55E00',
        },
        warning: {
          light: '#FFB74D',
          main: '#E69F00',
          dark: '#B87F00',
          DEFAULT: '#E69F00',
        },
        neutral: {
          main: '#888888',
          dark: '#666666',
          DEFAULT: '#888888',
        },
        info: {
          main: '#0072B2',
          light: '#56B4E9',
          DEFAULT: '#0072B2',
        },
        // Legacy colors (keep for backward compatibility)
        accent: {
          orange: '#FF6B35',
          green: '#22C55E',
          yellow: '#FFC107',
          red: '#EF4444',
        },
        background: {
          white: '#FFFFFF',
          light: '#F9FAFB',
          offwhite: '#F5F7FA',
          dark: '#111827',
        },
        dark: {
          background: '#0F172A',
          surface: '#1E293B',
          border: '#334155',
          'text-primary': '#F3F4F6',
          'text-secondary': '#CBD5E1',
          'primary-blue': '#3B82F6',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        // Headings
        h1: ['32px', { lineHeight: '40px', letterSpacing: '-0.025em', fontWeight: '700' }],
        h2: ['28px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '600' }],
        h3: ['24px', { lineHeight: '32px', letterSpacing: '-0.015em', fontWeight: '600' }],
        h4: ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '500' }],
        h5: ['18px', { lineHeight: '24px', letterSpacing: '0', fontWeight: '500' }],
        // Body Text
        'body-large': ['17px', { lineHeight: '24px', letterSpacing: '0' }],
        body: ['15px', { lineHeight: '22px', letterSpacing: '0' }],
        'body-small': ['13px', { lineHeight: '18px', letterSpacing: '0.01em' }],
        // Special Text
        caption: ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '500' }],
        button: ['16px', { lineHeight: '24px', letterSpacing: '0.01em', fontWeight: '500' }],
        data: ['14px', { lineHeight: '20px', letterSpacing: '0', fontWeight: '500' }],
      },
      spacing: {
        micro: '4px',
        tiny: '8px',
        small: '12px',
        default: '16px',
        medium: '20px',
        large: '24px',
        xl: '32px',
        huge: '48px',
      },
      borderRadius: {
        button: '8px',
        card: '12px',
        input: '8px',
        fab: '28px',
      },
      boxShadow: {
        button: '0 2px 4px rgba(0, 71, 171, 0.2)',
        'button-hover': '0 4px 8px rgba(0, 71, 171, 0.3)',
        card: '0 1px 3px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 6px rgba(0, 0, 0, 0.1)',
        dropdown: '0 10px 25px rgba(0, 0, 0, 0.1)',
        fab: '0 4px 12px rgba(0, 71, 171, 0.3)',
        nav: '0 -2px 10px rgba(0, 0, 0, 0.05)',
        focus: '0 0 0 3px rgba(0, 71, 171, 0.1)',
      },
      transitionDuration: {
        micro: '150ms',
        standard: '200ms',
        smooth: '300ms',
        page: '350ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        page: 'cubic-bezier(0.0, 0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        scale: 'scale 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'spin-smooth': 'spin 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scale: {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      minHeight: {
        touch: '44px',
      },
      height: {
        'button-mobile': '48px',
        'button-desktop': '40px',
        'input-mobile': '56px',
        'input-desktop': '48px',
        'nav-bottom': '64px',
      },
    },
  },
  plugins: [],
};
