import { expect, test } from "@playwright/test";
import { SITE } from "./fixture";
import { open, SITE_PATH } from "./helpers";

test("settings: the owner renames the site and the change persists", async ({
  page,
}) => {
  await open(page, `${SITE_PATH}/settings`);
  const name = page.getByLabel("Name", { exact: true });
  await expect(name).toHaveValue(SITE.name);
  await name.fill(`${SITE.name} renamed`);
  await page.getByRole("button", { name: "Save general" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved." })
  ).toBeVisible({ timeout: 20_000 });

  await page.reload();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    `${SITE.name} renamed`
  );
  await expect(page.getByRole("button", { name: /^Site / })).toContainText(
    SITE.url
  );

  await page.getByLabel("Name", { exact: true }).fill(SITE.name);
  await page.getByRole("button", { name: "Save general" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved." })
  ).toBeVisible({ timeout: 20_000 });
});
