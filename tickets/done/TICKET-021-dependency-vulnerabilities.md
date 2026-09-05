# TICKET-021: Clear dependency vulnerabilities

**Status:** done
**Created:** 2026-09-05
**Started:** 2026-09-05
**Completed:** 2026-09-05
**Area:** infra

## Goal
Clear the 17 vulnerabilities GitHub reported on the default branch after the Phase 0 design push (10 high, 5 moderate, 2 low).

## Context
- Reported by GitHub on the push of commit e35409d; details at
  https://github.com/harshturna/lynq/security/dependabot.
- Most are likely transitive from packages last bumped in TICKET-001; `npm audit` locally will
  list them.
- Independent of Phase 0; can be done at any point.

## Plan
- [x] `npm audit` and record the list here.
- [x] `npm audit fix` for non-breaking updates; evaluate each remaining one and bump or replace the
      package.
- [x] Verify: `npm audit` shows zero high, `npm run verify`, `npm run build`.

## Progress log
- 2026-09-05 — Created from the Phase 0 design (TICKET-011, D-004, D-005).
- 2026-09-05 — Started and closed. `npm audit` showed 8 advisories (6 high, 1 moderate, 1 low),
  all transitive build-tool dependencies (brace-expansion, cross-spawn, glob, lodash, minimatch,
  picomatch, postcss-selector-parser, yaml), all with non-breaking fixes. `npm audit fix`
  applied them; every suite re-run.

## Handoff
Closed. See Outcome.

## Verification
```
npm audit   # before
total 8 {"high":6,"low":1,"moderate":1}
 high     brace-expansion              via brace-expansion Regular Expression Denial of Service vulnerability | brace-expansion: Zero fixAvailable=true
 high     cross-spawn                  via Regular Expression Denial of Service (ReDoS) in cross-spawn fixAvailable=true
 high     glob                         via glob CLI: Command injection via -c/--cmd executes matches with shell:true fixAvailable=true
 high     lodash                       via lodash vulnerable to Code Injection via `_.template` imports key names | lodash vulnerable fixAvailable=true
 high     minimatch                    via minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern | minima fixAvailable=true
 high     picomatch                    via Picomatch: Method Injection in POSIX Character Classes causes incorrect Glob Matching | Pi fixAvailable=true
 low      postcss-selector-parser      via postcss-selector-parser allows denial of service through uncontrolled AST recursion fixAvailable=true
 moderate yaml                         via yaml is vulnerable to Stack Overflow via deeply nested YAML collections fixAvailable=true

npm audit fix
npm audit   # after
found 0 vulnerabilities

npm run build          # Compiled successfully
npm run test:integration   # Test Files 4 passed, Tests 18 passed
npm run test:e2e           # 13 passed
npm run verify
Found 46 warnings.
Ticket check passed (22 tickets).
 Test Files  18 passed (18)
      Tests  87 passed (87)
```

## Outcome
Shipped: lockfile updates clearing the advisories GitHub reported; no source changes.

Left out: nothing.

Follow-up tickets: none.
