/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#FAF9F6',
          100: '#F4EFE7',
          200: '#E8DAC8',
          300: '#D9B98C',
          400: '#D97706',
          500: '#B86A12',
          600: '#8B5A2B',
          700: '#6B3F2A',
          800: '#4A2D21',
          900: '#2C2C2C',
        },
        warm: {
          50:  '#FAF9F6',
          100: '#F5F1E8',
          200: '#E8E0D4',
          300: '#D5C3AE',
          400: '#B86A12',
        },
        accent: {
          red:   '#7A3E2A',
          green: '#2F5233',
          gold:  '#D97706',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        'warm':    '0 4px 15px rgba(139, 90, 43, 0.12)',
        'warm-md': '0 8px 24px rgba(44, 44, 44, 0.08)',
        'warm-lg': '0 12px 32px rgba(139, 90, 43, 0.15)',
        'card':    '0 2px 12px rgba(44, 44, 44, 0.06)',
      },
      animation: {
        'pulse-elegant': 'pulseElegant 2s ease-in-out infinite',
      },
      keyframes: {
        pulseElegant: {
          '0%,100%': { boxShadow: '0 4px 15px rgba(139, 90, 43, 0.12)' },
          '50%':     { boxShadow: '0 8px 24px rgba(217, 119, 6, 0.2)' },
        },
      },
    },
  },
  plugins: [],
};
