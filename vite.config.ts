import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { lessonMetaPlugin } from './scripts/lessonMetaPlugin';

// Relative base + HashRouter: the same build runs from a static host,
// a plain folder and Electron's file:// without any rewrites.
export default defineConfig({
  base: './',
  plugins: [react(), lessonMetaPlugin()],
  server: { port: 5183 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
