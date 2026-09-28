import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['app/tests/**/*.test.ts'],
    // Node 25+ ships a stub global localStorage that shadows jsdom's.
    execArgv: ['--no-experimental-webstorage'],
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './app') },
  },
})
