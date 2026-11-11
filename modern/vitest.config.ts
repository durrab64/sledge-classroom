import path from 'node:path';
import { defineConfig } from 'vitest/config';

// `import.meta.dirname` avoids Vite's configLoader warning about `__dirname`.
const rootDir = import.meta.dirname ?? process.cwd();

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
    globals: true,
  },
});
