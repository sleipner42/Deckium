import { defineConfig } from '@playwright/test';

// Electron E2E suite. Opt-in (npm run test:e2e), not part of `npm test` — it
// drives the built app over the DevTools Protocol and needs a display.
export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: [['list']],
});
