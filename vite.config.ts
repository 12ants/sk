import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 7777,
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
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
});
