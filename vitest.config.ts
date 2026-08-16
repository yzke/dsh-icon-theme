import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
    exclude: ['tests/web/**', '**/node_modules/**'],
    pool: 'forks',
    testTimeout: 20_000,
  },
})
