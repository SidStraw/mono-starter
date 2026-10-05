import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: true,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium' },
  webServer: {
    command: 'pnpm exec vp -C apps/web preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
