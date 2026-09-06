import { expect, test } from "@playwright/test";
import { axeClean, noPageOverflow, open, SITE_PATH } from "./helpers";

// The Bots screen (D-018): the pool of crawler hits split by family, then
// crawlers, the orientation files and pages, with a family view on Pages.
test("appears in the nav once a site has crawler hits, and reads the split", async ({
  page,
}) => {
  await open(page, SITE_PATH);
  await page
    .getByRole("navigation", { name: "Sections" })
    .getByRole("link", { name: "Bots" })
    .click();
  await expect(page).toHaveURL(new RegExp(`${SITE_PATH}/bots$`));
  await expect(page.locator("h1")).toHaveText("Bots");

  await expect(
    page.getByText(/crawler hits in the last 30 days/)
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /^Hits by family: Answers \d+%/ })
  ).toBeVisible();
  await expect(page.getByText(/to answer someone/)).toBeVisible();

  const crawlers = page.getByRole("region", { name: "Crawlers" });
  await expect(
    crawlers.getByRole("columnheader", { name: "Hits" })
  ).toBeVisible();
  await expect(crawlers.getByText("ChatGPT-User")).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Looking for instructions" })
      .getByText("llms.txt")
  ).toBeVisible();

  // hits are ordered, so the first crawler row holds the most
  const hits = await crawlers
    .locator("tbody tr td:nth-child(3)")
    .allInnerTexts();
  const numbers = hits.map((s) => Number.parseInt(s.replace(/,/g, ""), 10));
  expect(numbers.length).toBeGreaterThan(2);
  expect([...numbers].sort((a, b) => b - a)).toEqual(numbers);

  await noPageOverflow(page);
  await axeClean(page);
});

test("the Pages table narrows to one family through the URL", async ({
  page,
}) => {
  await open(page, `${SITE_PATH}/bots`);
  await page
    .getByRole("tablist", { name: "Pages view" })
    .getByRole("tab", { name: "Answers" })
    .click();
  await expect(page).toHaveURL(/view\.bots=answers/);
  await expect(
    page
      .getByRole("tablist", { name: "Pages view" })
      .getByRole("tab", { name: "Answers" })
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page
      .getByRole("region", { name: "Pages" })
      .getByText("/docs/getting-started")
  ).toBeVisible();
});

test.describe("at 375 px", () => {
  test.use({ viewport: { width: 375, height: 900 } });
  test("the lead still reads and nothing overflows", async ({ page }) => {
    await open(page, `${SITE_PATH}/bots`);
    await expect(
      page.getByText(/crawler hits in the last 30 days/)
    ).toBeVisible();
    await noPageOverflow(page);
  });
});
