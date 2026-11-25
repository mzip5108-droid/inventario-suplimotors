import { defineConfig } from 'vite';

export default defineConfig({
  base: '/inventario-suplimotors/', // <-- Esto es VITAL para GitHub Pages
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});