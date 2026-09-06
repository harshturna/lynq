import { expect, test } from "@playwright/test";
import { open, SITE_PATH, sharedCopy } from "./helpers";

test("sources: view tab, channel filter and the share round-trip", async ({
  page,
  browser,
}) => {
  await open(page, `${SITE_PATH}/sources`);
  await expect(page.getByRole("region", { name: "Summary" })).toBeVisible();

  await page
    .getByRole("tablist", { name: "Sources view" })
    .getByRole("tab", { name: "Referrers" })
    .click();
  await expect(page).toHaveURL(/view\.sources=referrers/);

  await page.getByRole("button", { name: "Filter by Organic Search" }).click();
  await expect(page).toHaveURL(/f=entry_channel/);
  await expect(
    page.getByRole("button", { name: /Organic Search, press Delete to remove/ })
  ).toBeVisible();
  // With one channel left the Channels table is that channel alone.
  const channels = page.getByRole("region", { name: "Channels" });
  await expect(
    channels.getByRole("button", { name: /press Enter to filter/ })
  ).toHaveCount(1);

  const copy = await sharedCopy(browser, page.url());
  await expect(copy.getByRole("tab", { name: "Referrers" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(
    copy.getByRole("button", { name: /Organic Search, press Delete to remove/ })
  ).toBeVisible();
  await copy.context().close();
});
