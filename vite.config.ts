import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relative base + HashRouter: the same build runs from a static host,
// a plain folder and Electron's file:// without any rewrites.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5183 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
