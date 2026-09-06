# Attention and influence

**Status:** agreed, being built under TICKET-080
**Written:** 2026-09-06
**Decision:** D-016

A second reading of rows Lynq already stores. Nothing new is collected, no privacy trade-off
changes, and every existing metric stays exactly as it is. The pitch: **Lynq measures attention
and outcomes, not hits.**

## 1. Why

Pageviews rank pages by how often they were opened. That is the wrong question for most sites.
The home page of the seeded site takes 1,716 pageviews and 859 minutes of attention;
`/docs/getting-started` takes 1,034 pageviews and 1,546 minutes. A ranked list of pageviews puts
them in the wrong order for anyone asking which page is doing work.

The same rows can answer two more questions no cookieless competitor answers: whether people
read a page, and whether seeing it makes a visitor more likely to do the thing the site is for.

## 2. The three metrics

Definitions are the product's vocabulary and expensive to rename, so they are fixed here and in
D-016 before any code.

### Attention

**Attention** is the engaged milliseconds a page accumulated over the range, shown in minutes.
Engaged time is already defined (phase-0 §6.2): the time the page was visible *and* focused,
accumulated by the tracker and reported on `engagement` events, which carry the page's `path`
and `pageview_id`.

**Attention share** is a page's attention over the site's attention in the range.

Attention is a total, and it is what ranks pages. It is not the existing **Engaged time** metric,
which is an average per session and stays where it is. Both can be on screen at once without
contradiction, and the docs say which is which.

### Read-through

**Read-through** is the share of a page's pageviews where the deepest scroll reached at least
**75%** of the document and engaged time was at least **10 seconds**.

- Scroll depth is reported as `(scrollY + innerHeight) / scrollHeight`, so 100% is the very
  bottom of the page and 75% is "read most of it".
- The 10 second floor is the bounce floor (phase-0 §6.3), reused deliberately so the two agree
  about what counts as reading at all.
- Below **30 pageviews** in the range a page shows an em dash rather than a number, because the
  share of a handful of views is noise.

Read-through is per pageview, not per session: the same person returning to finish an article is
two chances to read it.

### Influence

**Influence** is how much more often the KPI goal is reached by sessions that saw a page than by
sessions that did not, as a ratio. 1.5× means sessions that saw it converted half as often again.

The rule that makes it honest: **a page is only credited when it was seen before the session's
first completion.** Without it the metric ranks post-conversion pages first and says nothing.
Measured on the seeded site, the naive version puts `/dashboard` on top at 3.16×, which is only
true because people reach the dashboard by signing up. With the rule, `/dashboard` leaves the
list and the ranking becomes `/pricing` 1.5×, `/customers` 1.39×, `/features` 1.29×, with the
home page at 0.71× and blog posts below 1.

- The comparison group is every other session in the range, converted or not.
- Both sides need at least **50 sessions**, else the page shows an em dash.
- It needs a KPI goal. Without one the column is absent, not empty.
- It is association, not cause, and the UI says so in the column's description rather than
  leaving the reader to assume.

## 3. Where it shows

The Pages screen gains a fourth view beside All, Entry and Exit: **Attention**.

| Column | |
|---|---|
| Page | the label |
| Attention | minutes, the primary column and the default sort |
| Share | attention share |
| Read-through | percentage, or an em dash under the minimum |
| Influence | lift against the KPI goal, or absent without a goal |

That is four numeric columns, which is D-013's cap. Pageviews, visitors and bounce stay one view
away and in the drawer and the CSV.

The attention line above the table (D-011) is reworded in the same terms: it already says how
concentrated attention is, and it now says so in minutes.

The Overview's Pages table can rank by attention instead of visitors. That is a later step and
not part of the first cut.

## 4. What it costs

Attention and read-through are one grouped scan of `engagement` rows, which is a smaller set than
pageviews. Influence is the sessions CTE joined to the goal-matching rows, which is the shape
`goalStats` already uses. Budgets go in the integration harness with everything else.

The daily rollup (D-015) does not carry these yet, so the Attention view reads raw rows and is
covered by the ordinary statement timeout. If it turns out to need the rollup, that is a
follow-up with real numbers behind it, not a guess now.

## 5. Honesty

Every metric here depends on the visibility signal, which is reliable on desktop and good on
mobile. A page with too few pageviews or too few sessions shows an em dash rather than a number
that would only mislead. Each definition appears in one sentence in the UI where the number is,
and verbatim in the docs' counting page.
