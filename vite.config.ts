import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { lessonMetaPlugin } from './scripts/lessonMetaPlugin';

// Relative base + HashRouter: the same build runs from a static host,
// a plain folder and Electron's file:// without any rewrites.
export default defineConfig({
  base: './',
  plugins: [react(), lessonMetaPlugin()],
  server: { port: 5183 },
  // The Python worker loads Pyodide with a dynamic import, which needs a module worker.
  worker: { format: 'es' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
