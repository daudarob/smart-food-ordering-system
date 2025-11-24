import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensure public assets are served correctly
  publicDir: 'public',
  server: {
    // Allow serving assets from public folder
    fs: {
      strict: false
    }
  },
  // Proxy removed due to JSON body corruption issues
  // Frontend now makes direct requests to backend
})