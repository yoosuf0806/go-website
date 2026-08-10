import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Golden Oven — warm bakery palette.
        cocoa: {
          50: '#faf6f2',
          100: '#f2e8df',
          200: '#e4cfbc',
          300: '#d0ac8f',
          400: '#b9855f',
          500: '#a56a44',
          600: '#8a5236',
          700: '#6f402d',
          800: '#5a3527',
          900: '#4a2d22',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
