import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'
import path from 'path'

export default defineConfig({
  plugins: [react(), cesium()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/test/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
