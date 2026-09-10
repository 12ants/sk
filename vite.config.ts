import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ['info', 'warn', 'error'],
    },
  },
  resolve: {
    alias: {
      cannon: fileURLToPath(new URL('./src/lib/cannon/cannon.js', import.meta.url)),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, '.claude/**', '.worktrees/**'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
});
