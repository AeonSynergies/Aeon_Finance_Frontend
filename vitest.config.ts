import { defineConfig } from 'vitest/config'
import path from 'node:path'

const nodeMajor = Number(process.versions.node.split('.')[0])

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['app/tests/**/*.test.ts'],
    // Node 25+ ships a stub global localStorage that shadows jsdom's — this flag
    // doesn't exist before Node 25 and crashes the worker if passed unconditionally.
    execArgv: nodeMajor >= 25 ? ['--no-experimental-webstorage'] : [],
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './app') },
  },
})
