import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: true,
  timeout: 20000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
    headless: true,
    screenshot: 'off',
    trace: 'off',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: 'https://hmrtffcpoyksnwdquyow.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_mock-only',
    },
  },
})
