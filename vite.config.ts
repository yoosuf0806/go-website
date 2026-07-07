import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // react-helmet-async is CJS with named exports that Node's ESM interop can't
  // read when externalized — bundle it into the SSR build so the prerender can
  // import the server entry cleanly.
  ssr: {
    noExternal: ['react-helmet-async'],
  },
})
