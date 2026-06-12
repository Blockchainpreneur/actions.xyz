import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  timeout: 15000,
  use: {
    baseURL: process.env.PW_BASE_URL ?? 'http://localhost:3000',
    actionTimeout: 5000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
