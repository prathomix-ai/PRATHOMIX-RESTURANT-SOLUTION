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
          50:  '#FAF5F0',
          100: '#F3E8DE',
          200: '#E7D1BD',
          300: '#D4A574',
          400: '#C85A17',
          500: '#B85016',
          600: '#A13D0F',
          700: '#8B2E1F',
          800: '#6B2318',
          900: '#4B1810',
        },
        warm: {
          50:  '#F8F5F0',
          100: '#F0EDE8',
          200: '#E8E3DB',
          300: '#D4A574',
          400: '#C85A17',
        },
        accent: {
          red:   '#8B2E1F',
          green: '#2D5016',
          gold:  '#D4A574',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        'warm':    '0 4px 15px rgba(200, 90, 23, 0.12)',
        'warm-md': '0 8px 24px rgba(45, 45, 45, 0.08)',
        'warm-lg': '0 12px 32px rgba(200, 90, 23, 0.15)',
        'card':    '0 2px 12px rgba(45, 45, 45, 0.06)',
      },
      animation: {
        'pulse-elegant': 'pulseElegant 2s ease-in-out infinite',
      },
      keyframes: {
        pulseElegant: {
          '0%,100%': { boxShadow: '0 4px 15px rgba(200, 90, 23, 0.12)' },
          '50%':     { boxShadow: '0 8px 24px rgba(200, 90, 23, 0.2)' },
        },
      },
    },
  },
  plugins: [],
};
