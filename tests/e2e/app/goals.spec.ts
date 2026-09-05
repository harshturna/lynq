import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { GUEST_STATE } from "../../../playwright.config";
import { open, SITE_PATH } from "./helpers";

const NAME = "E2E pricing goal";

test.afterAll(async () => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
  });
  await sql`delete from public.goals where name = ${NAME}`;
  await sql.end();
});

test("goals: the KPI is marked; the owner creates a goal", async ({ page }) => {
  await open(page, `${SITE_PATH}/goals`);
  await expect(
    page.getByRole("button", { name: /Signup is the KPI/ })
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "+ New goal" }).click();
  const form = page.getByRole("form").or(page.locator("form")).first();
  await form.getByLabel("Name", { exact: true }).fill(NAME);
  await form.getByRole("radio").first().check();
  await form.getByLabel("Path glob").fill("/pricing");
  await form.getByRole("button", { name: /goal$/ }).click();
  await expect(
    page.getByRole("button", { name: NAME, exact: true })
  ).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByRole("button", { name: `Edit ${NAME}` })
  ).toBeVisible();
});

test.describe("as the guest", () => {
  test.use({ storageState: GUEST_STATE });
  test("goals: a site the guest does not own is not found", async ({
    page,
  }) => {
    const res = await page.goto(`${SITE_PATH}/goals`);
    expect(res?.status()).toBe(404);
  });
});
