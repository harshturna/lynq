import { expect, test } from "@playwright/test";
import { OWNER_STATE } from "../../../playwright.config";
import { USERS } from "./env.mjs";
import { axeClean, noPageOverflow } from "./helpers";

// The auth pages on the light theme (TICKET-062): both render in the landing
// frame, are clean at both widths, a wrong password is said plainly, and the
// real sign-in still lands on /sites.
test.use({ storageState: { cookies: [], origins: [] } });

for (const width of [1280, 375]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const [path, heading] of [
      ["/login", "Log in"],
      ["/sign-up", "Create your account"],
    ]) {
      test(`${path} renders in the light frame`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          heading
        );
        await expect(
          page.getByRole("navigation", { name: "Site" })
        ).toBeVisible();
        const bg = await page.evaluate(
          () => getComputedStyle(document.body).backgroundColor
        );
        expect(bg).toBe("rgb(255, 255, 255)");
        await noPageOverflow(page);
        await axeClean(page);
        await page.screenshot({
          path: `test-results/auth-${path.slice(1)}-${width}.png`,
          fullPage: true,
        });
      });
    }
  });
}

test("a wrong password is refused in plain words", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(USERS.owner.email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    /do not match/
  );
  await expect(page).toHaveURL(/\/login/);
});

test("the owner signs in and lands on the sites list", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(USERS.owner.email);
  await page.getByLabel("Password").fill(USERS.owner.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/sites$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sites");
});

test("signed out, an unknown URL goes to the login page", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page).toHaveURL(/\/login/);
});

test.describe("signed in", () => {
  test.use({ storageState: OWNER_STATE });
  test("an unknown URL gets the 404 in the same frame", async ({ page }) => {
    const res = await page.goto("/no-such-page");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "There is no page here."
    );
    await expect(
      page.getByRole("link", { name: "Go to my sites" })
    ).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Site" })).toBeVisible();
  });
});
