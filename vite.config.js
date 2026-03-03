import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  server: {
    host: '127.0.0.1', // Avoid uv_interface_addresses errors; use 0.0.0.0 if you need LAN access
    port: 5173,
    strictPort: false, // Allow port fallback if 5173 is taken
    open: false, // Don't auto-open browser
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
})
