import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standalone internal dashboard. Runs on its own port so it stays separate
// from the public storefront while sharing the same Supabase project.
export default defineConfig({
  plugins: [react()],
  server: { port: 5180 },
})
