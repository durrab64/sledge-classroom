import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the eagerly-imported Firebase SDK (app, auth, Firestore) into
        // its own chunk. Vite emits modulepreload links for statically
        // imported entry chunks, so this file downloads in parallel with the
        // app chunk instead of one large monolith, and it is cached across
        // releases (Firebase updates rarely). `firebase/database` stays a
        // dynamic import (lazy Now Playing SDK).
        manualChunks(id: string) {
          if (
            !id.includes('node_modules') ||
            !(id.includes('/firebase/') || id.includes('/@firebase/'))
          ) {
            return undefined;
          }
          // Keep the lazily-loaded Realtime Database SDK out of the eager
          // chunk; it belongs to the dynamic Now Playing import.
          if (id.includes('@firebase/database') || id.includes('firebase/database')) {
            return undefined;
          }
          return 'firebase';
        },
      },
    },
  },
});
