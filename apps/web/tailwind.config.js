const designSystemConfig = require('../../packages/design-system/tailwind.config.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [designSystemConfig], // Inherit design system tokens

  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    // CRITICAL: Include design system components
    '../../packages/design-system/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // All custom colors are extended, not replaced
      // This ensures we keep Tailwind's default red, green, etc. colors
    },
  },
  plugins: [],
};