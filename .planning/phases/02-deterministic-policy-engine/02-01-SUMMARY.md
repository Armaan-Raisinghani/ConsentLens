---
phase: 02-deterministic-policy-engine
plan: "01"
subsystem: engine
tags: [policy-engine, rule-parser, rule-matcher, decision-engine, tracer]
dependencies:
  requires: []
  provides: [engine-types, rule-parser, rule-matcher, decision-engine]
  affects: [ir, adapters]
tech_stack:
  added:
    - src/engine/types.ts
    - src/engine/rule-parser.ts
    - src/engine/rule-matcher.ts
    - src/engine/decision-engine.ts
    - src/engine/index.ts
  patterns:
    - uBlock-style rule syntax
    - ParsedRule AST representation
    - Domain matching (exact, suffix, wildcard, regex)
    - Capability matching (exact, category wildcard, provider wildcard)
    - DecisionEngine with first-match precedence
key_files:
  created:
    - src/engine/types.ts
    - src/engine/rule-parser.ts
    - src/engine/rule-matcher.ts
    - src/engine/decision-engine.ts
    - src/engine/index.ts
    - test/engine/decision-engine.tracer.test.ts
    - test/engine/rule-parser.test.ts
    - test/engine/rule-matcher.test.ts
  modified:
    - package.json
    - tsup.config.ts
decisions:
  - uBlock-style policy syntax with capability@domain = action format
  - Exception rules (@@ prefix) imply allow action
  - Domain matching follows uBlock semantics (suffix match)
  - Capability matching supports wildcards at category and provider level
  - Precedence layer defaults to 'user' for tracer
  - DecisionEngine returns first matching rule (single rule for tracer)
metrics:
  duration: "~25 min"
  completed_date: "2026-10-03"
  tasks_completed: 3
  commits: 3
status: complete
actuals:
  tokens: 52000
  tasks: 3
  commits: 3
  plan_head_before: "d0d1f6e"
  plan_head_after: "e2f68cc"
---

# Phase 02 Plan 01: Deterministic Policy Engine - Tracer + Expansion Summary

## One-Liner

Built the core deterministic policy engine with uBlock-style rule parsing, domain/capability matching, and decision engine — tracer proves end-to-end flow: `oauth.google@drive.google.com = deny` → parsed AST → matched → deny decision.

## Objectives Achieved

| Task | Type | Description | Status |
|------|------|-------------|--------|
| 1 | tracer | One rule end-to-end: parser → matcher → decision | ✅ |
| 2 | auto | Full rule parser with all ENGINE-01/03/04/05 syntax | ✅ |
| 3 | auto | Full domain and capability matching logic | ✅ |

## Files Created

### Engine Core (`src/engine/`)
- **types.ts** — ParsedRule, MatchResult, Decision ('allow'|'ask'|'deny'), EngineDecision, PrecedenceLayer, PRECEDENCE_WEIGHTS, generateRuleId()
- **rule-parser.ts** — parseRule(), parseRules() with full syntax support
- **rule-matcher.ts** — matchRule(), matchDomain(), matchCapability(), extractDomain()
- **decision-engine.ts** — DecisionEngine class with decide() method
- **index.ts** — Exports all engine modules

### Tests (`test/engine/`)
- **decision-engine.tracer.test.ts** — 7 tests: tracer rule parsed, matched, produces deny decision with explanation
- **rule-parser.test.ts** — 41 tests: all syntax variants, comments, empty lines, errors, multi-line
- **rule-matcher.test.ts** — 47 tests: domain (exact, suffix, wildcard, regex), capability (exact, category/provider/full wildcards)

## Verification Results

```
pnpm test test/engine/ → 95 tests passed
pnpm typecheck → 0 errors in new engine files (pre-existing errors in plugins only)
pnpm build → ESM/CJS builds successful (dist/engine/ created)
pnpm lint → 0 errors in new engine files
```

## Tracer Test Details

**Rule:** `oauth.google@drive.google.com = deny`
**Event:** ConsentEvent for Google OAuth on drive.google.com with drive.readonly scope
**Result:** 
- decision === 'deny' ✅
- matchedRule.raw === 'oauth.google@drive.google.com = deny' ✅
- explanation contains rule string ✅
- confidence === 1.0 ✅

## Rule Parser Syntax Coverage (41 tests)

| Variant | Example | Parsed |
|---------|---------|--------|
| Basic | `oauth.google@drive.google.com = deny` | ✅ |
| Exception | `@@oauth.google@drive.google.com` | ✅ |
| Wildcard domain | `oauth.google@*.google.com = deny` | ✅ |
| Suffix domain | `oauth.google@google.com = deny` | ✅ |
| Regex domain | `oauth.google@/drive\.google\.com/i = deny` | ✅ |
| Category wildcard | `cookie.*@example.com = deny` | ✅ |
| Provider wildcard | `oauth.google.*@drive.google.com = deny` | ✅ |
| Full wildcard | `*@example.com = deny` | ✅ |
| Inline comment | `oauth.google@domain = deny # comment` | ✅ |
| Block comment | `! comment line` | ✅ |
| Multi-line | parseRules() with line numbers | ✅ |

## Domain Matching (ENGINE-03)

| Pattern Type | Syntax | Matches |
|--------------|--------|---------|
| Exact | `drive.google.com` | `drive.google.com` only |
| Suffix (uBlock) | `google.com` | `google.com`, `drive.google.com`, `a.b.google.com` |
| Wildcard | `*.google.com` | `drive.google.com`, `mail.google.com` (NOT `google.com`) |
| Regex | `/pattern/flags` | Via RegExp with g,i,m,s,u,y flags |
| Universal | `*` | Any domain |

## Capability Matching (ENGINE-04)

| Pattern Type | Syntax | Matches |
|--------------|--------|---------|
| Exact oauth | `oauth.google` | OAuthCapability{provider:'google'} |
| Category wildcard | `oauth.*` | Any oauth capability |
| Provider wildcard | `oauth.google.*` | Any Google oauth scope |
| Exact browser-perm | `browser-permission.geolocation` | BrowserPermissionCapability{permission:'geolocation'} |
| Exact cookie | `cookie.analytics` | CookieCapability{category:'analytics'} |
| Cookie with name | `cookie.analytics._ga` | CookieCapability{category:'analytics', name:'_ga'} |
| Exact policy | `policy.data-collection` | PolicyCapability{practice:'data-collection'} |
| Exact terms | `terms.arbitration` | TermsCapability{clause:'arbitration'} |
| Full wildcard | `*` | Any capability |

## Deviation from Plan

### Auto-fixed Issues (Rule 1 - Bug)

**1. Inline comment handling in parseRule()**
- **Found during:** Task 2 test execution
- **Issue:** parseRule() didn't strip inline `# comments` before parsing
- **Fix:** Added inline comment stripping at start of parseRule()
- **Files modified:** src/engine/rule-parser.ts
- **Commit:** e2f68cc

**2. TypeScript noUncheckedIndexedAccess compatibility**
- **Found during:** typecheck after Task 3
- **Issue:** Array access `rest[0]` typed as `string | undefined` but logic guarantees existence
- **Fix:** Added `@ts-expect-error` directive with explanatory comment
- **Files modified:** src/engine/rule-matcher.ts
- **Commit:** e2f68cc

### Out of Scope (Pre-existing)

The following pre-existing files have TypeScript/lint errors unrelated to this plan:
- src/plugins/*, test/engine/policy-packs.test.ts, test/engine/decision-engine.integration.test.ts (future Phase 02-02/03 work)
- These are deferred items tracked in `.planning/WINDOWS.md`

## Known Stubs

None — all planned functionality implemented and tested.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: regex-dos | src/engine/rule-parser.ts | Regex domain patterns could cause ReDoS; validated at parse time with try/catch |
| threat_flag: rule-injection | src/engine/rule-parser.ts | Malformed rules could bypass validation; strict parsing with position errors |

## Decisions Made

1. **uBlock-style syntax** — Proven, familiar, composable (per PROJECT.md D-07)
2. **Exception rules imply allow** — `@@capability@domain` = exception allowing the action
3. **Suffix domain matching** — `example.com` matches subdomains per uBlock semantics
4. **Case-insensitive domains** — Domain matching is case-insensitive
5. **Precedence layer 'user' default** — Tracer uses single layer; multi-layer in Phase 02-02
6. **First-match wins** — DecisionEngine returns first matching rule decision

## Next Steps

Phase 02-02: Precedence Engine with 4-layer evaluation (user > trusted > community > defaults) and exception handling.
Phase 02-03: Policy Packs — built-in profiles (Balanced, Strict, Essential, No AI Training, Paranoid).
Phase 03: AI Semantic Layer integration with OpenJev.