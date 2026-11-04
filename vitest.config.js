import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['server/**/*.js', 'src/**/*.{js,jsx}'],
      exclude: ['server/index.js', 'server/seed.js', 'server/backup.js', 'src/main.jsx'],
    },
  },
})
