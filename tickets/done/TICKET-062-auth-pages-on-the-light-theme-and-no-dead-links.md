# TICKET-062: Auth pages on the light theme, the last dark remnants removed, no dead links

**Status:** done
**Created:** 2026-09-06
**Started:** 2026-09-06
**Completed:** 2026-09-06
**Area:** ui

## Goal
Every page the app serves, including Log in, Sign up and the 404, is on the light Ledger theme (D-008), nothing of the old dark kit remains in the tree, and no link anywhere in the app or the landing pages leads to a 404.

## Context
- Read on start: app/(auth)/login/page.tsx and sign-up/page.tsx are the old dark pages
  (`bg-black/80`, gradient buttons, shadcn Input/Label/Button, the old logo image, Satoshi).
  app/(auth)/actions.ts holds `login` and `signUp` server actions returning `{error, success}`;
  `signUp` treats a sign-up without a session (email confirmation on) as success and the page
  then pushes to /sites, which the middleware bounces back to /login. app/layout.tsx still sets
  `bg-black text-white` on the body and loads Satoshi and CalSans, which nothing uses; every
  new screen paints `bg-canvas font-sans text-ink` over it. app/globals.css carries the whole
  old shadcn palette (`--background` … `--sidebar-ring`, light and dark), a `.button` utility,
  blue gradients and two `@layer base` blocks that apply `bg-background` to the body.
  tailwind.config.ts maps that palette. components/ui/* (15 shadcn files), components/hint.tsx,
  error.tsx and loading.tsx have no importers outside the auth pages. There is no
  app/not-found.tsx, so an unknown URL gets Next's default page. app/(dev)/* return notFound()
  in production. app/(main)/dashboard redirects to /sites.
- The middleware sends a signed-in user away from /login and /sign-up to /sites, and an
  anonymous user to /login from everything but /, /login, /sign-up, /privacy.
- The e2e sign-in (tests/e2e/app/setup.ts) fills the email and password labels and clicks a
  button matching /^login/i; the guest flow clicks "Explore app as guest". The auth stub
  (supabase-stub.mjs) serves /token and /user only, so sign-up cannot be exercised end to end.
- Links to check: every `a[href]` on every route as the owner and the guest, the landing pages
  and the auth pages signed out, plus the external docs links (docs-lynq.byharsh.com paths,
  which TICKET-061 made exist) and GitHub.
- Look: the auth pages reuse the landing bar and footer (app/(landing)/_landing/nav.tsx,
  closing.tsx) and the onboarding's FIELD/PRIMARY classes, so they are the landing page's
  vocabulary with a form in it; no side panel, no illustration.

## Plan
- [x] app/(auth): shared layout with LandingNav and LandingFooter on bg-canvas; Log in (email, password, Log in button, guest button, link to Sign up) and Sign up (email, password, Create account, link to Log in); errors inline as `role="alert"`; a sign-up that needs email confirmation shows that instead of navigating.
- [x] app/not-found.tsx in the same vocabulary; app/layout.tsx body on the light tokens with Geist only; drop Satoshi/CalSans files and the font wiring.
- [x] Delete components/ui, hint.tsx, error.tsx, loading.tsx, public/assets/logo.png if unreferenced, and the old palette from globals.css and tailwind.config.ts; remove packages only they used.
- [x] tests/e2e/app/auth.spec.ts (both pages render, axe clean, sign-in works, wrong password shows the error) and links.spec.ts (crawl every route as owner, guest and signed out; every internal href answers < 400; external docs and GitHub links answer 200); update setup.ts for the new button name.
- [x] Verify: npm run verify; TEST_DATABASE_URL=… npm run test:e2e; screenshots of both pages at 1280 and 375 read once.

## Progress log
- 2026-09-06 — Created and started.
- 2026-09-06 — Built. Also removed while here, all unreferenced: constants.ts (the old dashboard's Web Vitals copy), hooks/use-mobile.tsx, components.json (shadcn), the Satoshi and CalSans font files, public/assets/logo.png, and fifteen packages only the old kit imported (@hookform/resolvers, react-hook-form, class-variance-authority, lucide-react, @vercel/functions and ten @radix-ui packages; popover, dialog and dropdown-menu stay, the shell uses them). The sign-up action now reports "check your email" when Supabase returns a user without a session instead of navigating to /sites and bouncing back. Supabase's error strings are reworded ("That email and password do not match."). Signed out, an unknown URL still goes to /login by the middleware; the 404 shows once signed in.

## Handoff
Closed; see Verification and Outcome.

## Verification
```
npm run verify                                 # lint, typecheck, ticket check, 157 unit tests: pass
TEST_DATABASE_URL=... npm run test:e2e         # 72 passed (2.7 m): 13 tracker, 4 setup, 55 app
  auth.spec.ts: both pages at 1280 and 375 in the landing frame on a white body, axe clean, no
    overflow; wrong password → "That email and password do not match."; owner sign-in lands on
    /sites; signed out /no-such-page → /login; signed in → 404 in the frame
  links.spec.ts: every a[href] on the 12 owner routes, the 2 guest routes and the 5 public
    routes fetched: none ≥ 400; the external docs and GitHub links answer 200
```
Screenshots test-results/auth-{login,sign-up}-{1280,375}.png read once.

## Outcome
Shipped: app/(auth)/layout.tsx, _auth/form.tsx, login and sign-up pages, reworded actions with
the confirmation state; app/not-found.tsx; app/layout.tsx on the light tokens with Geist only;
globals.css and tailwind.config.ts down to the Lynq tokens; components/ui, hint, error,
loading, constants.ts, hooks/, components.json, the old fonts and logo, and 15 packages gone;
auth.spec.ts and links.spec.ts; setup.ts matches the new button name. Left out: a password
reset flow (there is none in the product; a follow-up when someone asks), and a Share button
(the docs tell people to copy the address bar). No follow-ups filed.
