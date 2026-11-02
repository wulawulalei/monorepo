import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@xzy18/components': resolve(__dirname, 'packages/components/src'),
      '@xzy18/hooks': resolve(__dirname, 'packages/hooks/src'),
      '@xzy18/utils': resolve(__dirname, 'packages/utils/src'),
      '@xzy18/material-components': resolve(
        __dirname,
        'packages/material-components/src',
      ),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['packages/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.d.ts',
        '**/__test__/**',
        '**/*.{test,spec}.{ts,tsx}',
        '**/index.md',
        'packages/*/src/index.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
      },
    },
  },
});
