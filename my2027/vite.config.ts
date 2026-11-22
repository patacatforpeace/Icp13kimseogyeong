import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// base: './' keeps every asset path relative so the build can be served from any
// folder (artifact hosting, Vercel, GitHub Pages, or a plain file server).
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
  },
  test: { environment: 'node' },
} as any);
