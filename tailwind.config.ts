import type { Config } from 'tailwindcss'

// Golden Oven storefront design system. Primary palette: berry pink + near-black
// espresso, Playfair Display headings + Inter body (2026 revamp). The blush/wine/ink
// tokens remain temporarily while any remaining legacy surfaces are migrated.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pink: {
          DEFAULT: '#d92d56',
          light: '#f2dee3',
          dark: '#a03040',
        },
        navy: {
          DEFAULT: '#1a0a00',
          light: '#3a1a0a',
        },
        warmgray: '#fdf6f0',
        // Legacy tokens (removed once every surface is migrated).
        blush: { 50: '#fdf2f4', 100: '#fbe7ec', 200: '#f7d0da', 300: '#f0aebf' },
        wine: { DEFAULT: '#5d1f2f', 700: '#4a1826', 900: '#3a121d' },
        ink: '#1a1512',
        cream: '#fdf6f0',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 24s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
