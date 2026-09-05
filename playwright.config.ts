import { defineConfig } from "@playwright/test";

// Tracker behaviour tests (design §8.3) against tests/e2e/server.mjs, which
// serves fixture pages with the built tracker and records every batch.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4321",
    headless: true,
  },
  webServer: {
    command: "node tests/e2e/server.mjs",
    url: "http://localhost:4321/__batches",
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
