import { defineConfig } from 'vite';

export default defineConfig({
  base: '/inventario-suplimotors/',
  server: {
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});