import { mkdirSync } from "node:fs";
import { expect, type Page, test as setup } from "@playwright/test";
import { GUEST_STATE, OWNER_STATE } from "../../../playwright.config";
import databaseSetup from "../../setup/database";
import { USERS } from "./env.mjs";
import { createFixture, SITE, waitForPostgrest } from "./fixture";

const SCREENS = [
  "pages",
  "sources",
  "locations",
  "devices",
  "events",
  "goals",
  "performance",
  "realtime",
  "settings",
];

// Runs once before the app suite: schema and fixture into the test database,
// then a real sign-in for each user, whose cookies the specs reuse.
setup("schema and fixture", async () => {
  await databaseSetup();
  const { rows } = await createFixture(process.env.TEST_DATABASE_URL as string);
  expect(rows).toBeGreaterThan(1000);
  await waitForPostgrest();
});

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /^login/i }).click();
  await page.waitForURL(/\/sites$/, { timeout: 60_000 });
}

setup("sign in as the owner", async ({ page }) => {
  mkdirSync("test-results/.auth", { recursive: true });
  await signIn(page, USERS.owner.email, USERS.owner.password);
  await page.context().storageState({ path: OWNER_STATE });
});

// `next dev` compiles a route on its first request; warming them here keeps
// that cost (and the query timeouts it can trigger) out of the specs.
setup("warm every route", async ({ page }) => {
  for (const route of [
    "/sites",
    "/sites/new",
    `/${SITE.slug}`,
    ...SCREENS.map((s) => `/${SITE.slug}/${s}`),
  ]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
  }
});

setup("sign in as the guest", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /explore app as guest/i }).click();
  await page.waitForURL(/\/sites$/, { timeout: 60_000 });
  await page.context().storageState({ path: GUEST_STATE });
});
