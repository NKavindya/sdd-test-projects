import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
const backend =
  process.env.UEM_ORIGIN ||
  process.env.STORE_BACKEND ||
  'https://localhost:9443';
export default defineConfig({
  base: '/store/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/store-ui-request-handler': { target: backend, changeOrigin: true },
      '/api': { target: backend, changeOrigin: true },
    },
  },
});
