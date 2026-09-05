import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    include: ["**/*.integration.test.ts"],
    exclude: ["**/node_modules/**"],
    fileParallelism: false,
    globalSetup: ["./tests/setup/database.ts"],
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
