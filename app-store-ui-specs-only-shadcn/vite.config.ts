import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  base: '/store/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  server: {
    proxy: {
      '/store-ui-request-handler': {
        target: process.env.ENTGRA_BACKEND || 'https://localhost:9443',
        secure: false,
      },
      '/api': {
        target: process.env.ENTGRA_BACKEND || 'https://localhost:9443',
        secure: false,
      },
    },
  },
});
