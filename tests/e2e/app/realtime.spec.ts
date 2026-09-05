import { expect, test } from "@playwright/test";
import { open, SITE_PATH } from "./helpers";

test("realtime: live status, pause and resume, window in the URL", async ({
  page,
}) => {
  await open(page, `${SITE_PATH}/realtime`);
  await expect(
    page.getByRole("heading", { level: 2, name: "Pageviews per minute" })
  ).toBeVisible();
  await expect(page.getByText("live").first()).toBeVisible();

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText("Paused").first()).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  await page
    .getByRole("tab", { name: "Last hour" })
    .or(page.getByRole("radio", { name: "Last hour" }))
    .or(page.getByRole("button", { name: "Last hour" }))
    .first()
    .click();
  await expect(page).toHaveURL(/view\.realtime=hour/);
});
