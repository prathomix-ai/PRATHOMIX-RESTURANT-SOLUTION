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
          100: '#F5F1E8',
          200: '#EAE6DF',
          300: '#D5C3AE',
          400: '#C5A880', // Premium Gold Accent
          500: '#A88E67',
          600: '#8C7355', // Rich Bronze
          700: '#6E5940',
          800: '#4F3F2D',
          900: '#2F2519',
        },
        warm: {
          50:  '#FAF9F6',
          100: '#F5F1E8',
          200: '#EAE6DF',
          300: '#D5C3AE',
          400: '#C5A880',
        },
        accent: {
          red:   '#5C2E20', // Moody Dark Red
          green: '#1D3B24', // Moody Dark Green
          gold:  '#C5A880',
          bronze: '#8C7355',
          charcoal: {
            900: '#0A0A0A',
            800: '#121212',
            700: '#1A1A1A',
          }
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Cinzel', 'serif'],
        body: ['Montserrat', 'sans-serif'],
      },
      boxShadow: {
        'warm':    '0 4px 20px rgba(197, 168, 128, 0.06)',
        'warm-md': '0 8px 30px rgba(10, 10, 10, 0.5)',
        'warm-lg': '0 12px 40px rgba(197, 168, 128, 0.1)',
        'card':    '0 2px 18px rgba(10, 10, 10, 0.3)',
      },
      animation: {
        'pulse-elegant': 'pulseElegant 3s ease-in-out infinite',
      },
      keyframes: {
        pulseElegant: {
          '0%,100%': { boxShadow: '0 4px 20px rgba(197, 168, 128, 0.05)' },
          '50%':     { boxShadow: '0 8px 30px rgba(197, 168, 128, 0.15)' },
        },
      },
    },
  },
  plugins: [],
};
