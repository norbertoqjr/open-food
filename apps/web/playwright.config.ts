import { defineConfig, devices } from '@playwright/test';

// A production build+start, not `next dev`: Turbopack's dev server has
// noticeably higher first-load latency, and this suite mocks every network
// call the page makes (see e2e/search-and-locale.spec.ts), so there is no
// need for dev-mode fast refresh here.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm run start -- --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:9999',
    },
  },
});
