import { expect, test } from "@playwright/test";
import { axeClean, noPageOverflow } from "./helpers";

// The landing page is public: no storage state.
test.use({ storageState: { cookies: [], origins: [] } });

for (const width of [1280, 375]) {
  test(`landing at ${width} px is clean`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Analytics that respects"
    );
    await expect(
      page.getByRole("link", { name: "See the live demo →" })
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    // sections fade in as they enter; bring every one in before axe measures contrast
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    await noPageOverflow(page);
    await axeClean(page);
  });
}

test("the demo live route answers with JSON", async ({ page }) => {
  const res = await page.request.get("/api/demo/live");
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { visitorsNow: number | null };
  expect(body).toHaveProperty("visitorsNow");
});
