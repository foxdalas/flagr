import { defineConfig } from '@playwright/test'
import path from 'path'

export default defineConfig({
  testDir: path.join(__dirname),
  timeout: 30000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:18000',
    headless: true,
    actionTimeout: 10000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
})
