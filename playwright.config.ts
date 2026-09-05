import { defineConfig } from "@playwright/test";
import {
  ANON_KEY,
  APP_PORT,
  APP_URL,
  SUPABASE_URL,
  USERS,
} from "./tests/e2e/app/env.mjs";

// Two suites. `tracker` runs the tracker behaviour tests (design §8.3)
// against tests/e2e/server.mjs, which serves fixture pages with the built
// tracker and records every batch. `app` (TICKET-047) drives the real
// screens: `next dev` over the test database, a stand-in for the Supabase
// gateway (tests/e2e/app/supabase-stub.mjs) and a PostgREST container; it
// runs only when TEST_DATABASE_URL is set, as the integration suite does.
const db = process.env.TEST_DATABASE_URL;
const app = Boolean(db);
const reuse = !process.env.CI;

export const OWNER_STATE = "test-results/.auth/owner.json";
export const GUEST_STATE = "test-results/.auth/guest.json";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { headless: true },
  projects: [
    {
      name: "tracker",
      testMatch: /tracker\.spec\.ts$/,
      use: { browserName: "chromium", baseURL: "http://localhost:4321" },
    },
    ...(app
      ? [
          {
            name: "app:setup",
            testMatch: /app\/setup\.ts$/,
            timeout: 180_000,
            use: { browserName: "chromium" as const, baseURL: APP_URL },
          },
          {
            name: "app",
            testMatch: /app\/.*\.spec\.ts$/,
            dependencies: ["app:setup"],
            timeout: 90_000,
            use: {
              browserName: "chromium" as const,
              baseURL: APP_URL,
              storageState: OWNER_STATE,
              viewport: { width: 1280, height: 900 },
            },
          },
        ]
      : []),
  ],
  webServer: [
    {
      command: "node tests/e2e/server.mjs",
      url: "http://localhost:4321/__batches",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    ...(app
      ? [
          {
            command: "node tests/e2e/app/supabase-stub.mjs",
            url: `${SUPABASE_URL}/auth/v1/health`,
            reuseExistingServer: reuse,
            timeout: 30_000,
          },
          {
            command: `npx next dev -p ${APP_PORT}`,
            url: `${APP_URL}/login`,
            reuseExistingServer: reuse,
            timeout: 180_000,
            env: {
              LYNQ_E2E: "1",
              NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
              NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY,
              LYNQ_DB_POOLER_URL: db as string,
              LYNQ_IDENTITY_SECRET: "e2e-identity-secret",
              GUEST_USER_ID: USERS.guest.id,
            },
          },
        ]
      : []),
  ],
});
