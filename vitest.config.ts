import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests need no services and run inside `npm run verify`.
// Integration tests need TEST_DATABASE_URL (a local Supabase Postgres image or
// the CI service container) and run through `npm run test:integration`.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/*.integration.test.ts", "packages/**"],
  },
});
