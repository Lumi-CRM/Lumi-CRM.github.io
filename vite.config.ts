import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Keep the bootstrap files stable. A cached HTML shell must always be
        // able to start the newest deployment instead of pointing at a deleted
        // content-hashed entry file.
        entryFileNames: 'assets/[name].js',
        assetFileNames: assetInfo => assetInfo.name === 'index.css'
          ? 'assets/index.css'
          : 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    port: 3000,
    open: true
  }
})
