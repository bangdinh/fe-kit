import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'cmd/**/*.test.js'],
    environment: 'node',
  },
});
