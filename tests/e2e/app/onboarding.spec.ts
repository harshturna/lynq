import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { open } from "./helpers";

// The whole path a new site takes: added on step 1, the tracker's first
// batch accepted on step 2, a KPI picked on step 3, landing on its Overview.
const host = `onboard-${Date.now().toString(36)}.lynq.test`;
const slug = host.replaceAll(".", "-");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

test.afterAll(async () => {
  const sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
  });
  const sites = await sql<
    { id: number }[]
  >`select id from public.websites where slug = ${slug}`;
  for (const s of sites) {
    await sql`delete from analytics.events where site_id = ${s.id}`;
    await sql`delete from public.websites where id = ${s.id}`;
  }
  await sql.end();
});

test("onboarding: add a site, receive its first pageview, pick a KPI", async ({
  page,
}) => {
  await open(page, "/sites/new");
  await page.getByLabel("Name", { exact: true }).fill("Onboarding test");
  await page.getByLabel("Hostname", { exact: true }).fill(host);
  await page.getByRole("button", { name: "Add site" }).click();
  await expect(page.locator("pre")).toContainText(`data-site="${host}"`, {
    timeout: 20_000,
  });

  await page.getByRole("button", { name: "I've installed it" }).click();
  await expect(page).toHaveURL(new RegExp(`site=${slug}&step=2`));
  await expect(page.getByRole("status").first()).toContainText(/listening/i);

  // The tracker's first batch, sent the way the browser would.
  const hex = () => randomBytes(8).toString("hex");
  const res = await page.request.post("/api/collect", {
    headers: {
      origin: `https://${host}`,
      "user-agent": UA,
      "content-type": "application/json",
    },
    data: {
      v: 2,
      site: host,
      sid: hex(),
      pid: hex(),
      page: { url: `https://${host}/welcome`, title: "Welcome" },
      session: {},
      ctx: { sw: 1440, sh: 900, vw: 1280, vh: 800, lang: "en-CA" },
      events: [{ t: "pageview", ts: Date.now(), seq: 0 }],
    },
  });
  expect(res.status()).toBe(202);

  await expect(page.getByRole("status").first()).toContainText(
    /first pageview is in/i,
    { timeout: 30_000 }
  );
  await expect(page.getByText(/First pageview:/).locator("..")).toContainText(
    "/welcome"
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/step=3/);

  await page
    .getByRole("button", { name: /Signup|Sign-up|sign up/i })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`/${slug}$`), { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Overview");
});
