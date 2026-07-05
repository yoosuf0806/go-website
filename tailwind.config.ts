import type { Config } from 'tailwindcss'

// Golden Oven storefront design system — premium brownie-gifting aesthetic:
// soft blush backgrounds, deep wine editorial blocks, near-black poster type.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blush: {
          50: '#fdf2f4',
          100: '#fbe7ec',
          200: '#f7d0da',
          300: '#f0aebf',
        },
        wine: {
          DEFAULT: '#5d1f2f',
          700: '#4a1826',
          900: '#3a121d',
        },
        ink: '#1a1512',
        cream: '#faf6f0',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        poster: ['"Archivo Black"', 'Inter', 'sans-serif'],
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
