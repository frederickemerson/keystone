import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('./', import.meta.url));

export default defineConfig({
  test: {
    include: ['lib/**/__tests__/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['lib/**'],
    },
  },
  resolve: {
    alias: {
      '@': root.replace(/[\\/]$/, ''),
    },
  },
});
