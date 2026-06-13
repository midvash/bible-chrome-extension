import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig(({ mode }) => ({
  plugins: [react(), crx({ manifest })],
  build: {
    target: 'es2022',
    // Sourcemaps em dev pra debug; off em produção pra reduzir o ZIP da
    // Web Store e não expor estrutura interna desnecessariamente.
    sourcemap: mode !== 'production',
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        options: 'src/options/index.html',
        sidepanel: 'src/sidepanel/index.html',
      },
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    hmr: { port: 5181 },
  },
}));
