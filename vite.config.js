import { defineConfig } from 'vite';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  plugins: [vue()],
  root: 'web',
  server: {
    port: 3000,
    proxy: {
      '/socket.io': {
        target: 'ws://localhost:3005',
        ws: true
      },
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './web')
    }
  }
});
