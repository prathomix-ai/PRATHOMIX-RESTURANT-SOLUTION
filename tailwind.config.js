/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#050508',
          800: '#0a0a12',
          700: '#111120',
          600: '#1a1a2e',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 10px #00ffe7, 0 0 30px #00ffe780, 0 0 60px #00ffe740',
        'neon-sm':   '0 0 6px #00ffe7, 0 0 15px #00ffe750',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 10px #00ffe7, 0 0 20px #00ffe750' },
          '50%':     { boxShadow: '0 0 20px #00ffe7, 0 0 50px #00ffe780' },
        },
      },
    },
  },
  plugins: [],
};
