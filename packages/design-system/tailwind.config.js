/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // COLORS - Based on Design System Spec
      colors: {
        // Primary
        'primary-blue': '#2196F3',  // Material Design Blue 500
        'primary-white': '#FFFFFF',
        'primary-charcoal': '#1A1F2E',

        // Secondary
        'secondary-blue-light': '#4A90E2',
        'secondary-blue-pale': '#E8F0FE',
        'secondary-gray': '#6B7280',
        'secondary-light-gray': '#F3F4F6',

        // Accent
        'accent-orange': '#FF6B35',
        'accent-green': '#22C55E',
        'accent-yellow': '#FFC107',
        'accent-red': '#EF4444',

        // Functional (Okabe-Ito Color-blind Safe)
        'success': '#117733',  // Okabe-Ito bluish green
        'success-light': '#4CAF50',
        'success-dark': '#0D5E28',
        'error': '#D55E00',     // Okabe-Ito vermillion
        'error-light': '#EF5350',
        'error-dark': '#AA4A00',
        'warning': '#E69F00',   // Okabe-Ito orange
        'warning-light': '#FFB74D',
        'warning-dark': '#B87F00',
        'info': '#0072B2',      // Okabe-Ito blue
        'neutral': '#888888',   // Okabe-Ito grey

        // Background
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
    },
  },
  plugins: [],
};
