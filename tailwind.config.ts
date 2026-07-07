import type { Config } from 'tailwindcss'

// Golden Oven storefront design system. Primary palette: bright pink + navy,
// Abril Fatface headings + Nunito body (reference-matched). The blush/wine/ink
// tokens remain temporarily while Shop/PDP/modals are migrated to the new look.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pink: {
          DEFAULT: '#EE2F63',
          light: '#fff0f4',
          dark: '#c4194a',
        },
        navy: {
          DEFAULT: '#1A1A2E',
          light: '#2d2d4e',
        },
        warmgray: '#F4F4F4',
        // Legacy tokens (removed once every surface is migrated).
        blush: { 50: '#fdf2f4', 100: '#fbe7ec', 200: '#f7d0da', 300: '#f0aebf' },
        wine: { DEFAULT: '#5d1f2f', 700: '#4a1826', 900: '#3a121d' },
        ink: '#1a1512',
        cream: '#faf6f0',
      },
      fontFamily: {
        display: ['"Abril Fatface"', 'Georgia', 'serif'],
        sans: ['Nunito', 'system-ui', 'sans-serif'],
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
