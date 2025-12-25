import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Bind to all interfaces (IPv4 and IPv6) for better browser compatibility
    port: 5173,
    strictPort: false, // Allow port fallback if 5173 is taken
    open: false, // Don't auto-open browser
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
})
