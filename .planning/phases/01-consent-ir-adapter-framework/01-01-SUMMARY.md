---
phase: 01-consent-ir-adapter-framework
plan: 01
subsystem: core
tags: [foundation, ir, adapter, oauth, plugin, tracer]
requires: []
provides: [IR-01, IR-02, IR-03, IR-04, IR-05, ADAPTER-01, ADAPTER-06, PLUGIN-01]
affects: []
tech_stack:
  added: [pnpm, typescript, tsup, vitest, eslint, prettier, jsdom]
  patterns: [strict-typescript, dual-esm-cjs-build, barrel-exports, plugin-architecture]
key_files:
  created:
    - package.json
    - tsconfig.json
    - tsup.config.ts
    - vitest.config.ts
    - eslint.config.js
    - .prettierrc
    - src/ir/consent-event.ts
    - src/ir/capability.ts
    - src/ir/purpose.ts
    - src/ir/evidence.ts
    - src/ir/decision-record.ts
    - src/ir/index.ts
    - src/adapters/adapter.ts
    - src/adapters/oauth-adapter.ts
    - src/adapters/registry.ts
    - src/adapters/index.ts
    - src/plugins/adapter-plugin.ts
    - src/plugins/index.ts
    - src/shared/types.ts
    - src/shared/errors.ts
    - src/shared/index.ts
    - src/index.ts
    - test/fixtures/oauth-page.html
    - test/oauth-adapter.test.ts
    - .github/workflows/ci.yml
    - .github/dependabot.yml
  modified: []
decisions:
  - "D-01: Package manager: pnpm (fast, disk-efficient, monorepo-ready)"
  - "D-02: Build tool: tsup (zero-config, ESM/CJS dual output, esbuild-based)"
  - "D-03: Test framework: Vitest (native TS, fast, Vite-compatible)"
  - "D-04: Linting: ESLint + Prettier with typescript-eslint, eslint-plugin-vitest"
  - "D-05: TypeScript: strict mode, ES2022 target, NodeNext modules"
  - "D-06: Project structure: src/{ir,adapters,plugins,shared}"
  - "D-07: Capability taxonomy: Structured objects with discriminated unions"
  - "D-08: ConsentEvent required fields: website, consentType, capability, timestamp, grantStatus, evidence[]"
  - "D-09: Evidence references: Rich with confidence, extractionMethod, timestamp"
  - "D-10: Input context: Raw Document with full DOM access via PageContext"
  - "D-11: Method signature: Always async extract(context) returning AdapterResult"
  - "D-12: Error handling: Fail-open + error collection per adapter"
  - "D-13: OAuth detection: All patterns + generic fallback"
  - "D-14: Scope extraction: Both URL params and data-scope attributes, merged and deduplicated"
  - "D-15: Provider coverage: Core 5 (Google, GitHub, Microsoft, Slack, Discord)"
  - "D-22: Registration: Explicit array via AdapterRegistry.register()"
  - "D-23: Execution: Configurable priority sorting (ascending)"
  - "D-24: Shared context: Mutable enrichment via AdapterRegistry.sharedContext"
metrics:
  duration: "00:25:00"
  completed_date: "2026-10-03"
  tasks_completed: 3
  files_created: 27
  status: complete
  actuals:
    tokens: 74000
    tasks: 3
    commits: 2
    plan_head_before: "a60ac8a1f4e8e3b2c9d7f1e6a5b8c9d2f3e4a5b6"
    plan_head_after: "adf5fc1"
---

# Phase 01 Plan 01: Consent IR + Adapter Framework Foundation Summary

**One-liner:** Established project foundation with TypeScript strict mode, core ConsentEvent IR types, Adapter interface, OAuth adapter (tracer), adapter registry, and plugin interface — end-to-end extraction proven via test fixture.

## Tasks Completed

| Task | Name | Type | Commit |
|------|------|------|--------|
| 1 | Tracer: Project scaffold + Core IR + OAuth Adapter end-to-end extraction | tracer | 05db5c6 |
| 2 | Build configuration and type exports | auto | 05db5c6 (included) |
| 3 | CI pipeline configuration | auto | adf5fc1 |

## What Was Built

### Project Foundation (D-01 through D-06)
- **Package manager**: pnpm 9+ with lockfile for reproducible builds
- **Build tool**: tsup configured for dual ESM/CJS output with TypeScript declarations
- **Test framework**: Vitest with jsdom environment for DOM testing
- **Linting**: ESLint with typescript-eslint and vitest plugin, Prettier for formatting
- **TypeScript**: Strict mode, ES2022 target, NodeNext module resolution
- **Project structure**: `src/{ir,adapters,plugins,shared}` matching phase boundaries

### Core IR Types (IR-01 through IR-05, D-07 through D-09)
- **ConsentEvent** (`src/ir/consent-event.ts`): Unified consent schema with all required fields per D-08 (website, consentType, capability, timestamp, grantStatus, evidence[])
- **Capability** (`src/ir/capability.ts`): Discriminated union taxonomy per D-07 — OAuthCapability, BrowserPermissionCapability, CookieCapability, PolicyCapability, TermsCapability with factory functions
- **Purpose** (`src/ir/purpose.ts`): Inferred/stated/userIntent with confidence scoring
- **Evidence** (`src/ir/evidence.ts`): Rich references with source, selector, URL, text, confidence, extractionMethod, extractedAt per D-09
- **DecisionRecord** (`src/ir/decision-record.ts`): Matched rules, AI classification, confidence, provenance

### Adapter System (ADAPTER-01, ADAPTER-06, D-10 through D-12, D-22 through D-24)
- **Adapter interface** (`src/adapters/adapter.ts`): Async `extract(context)` returning `{events, errors}` per D-11, D-12
- **PageContext**: Provides raw `document`, `url`, `origin` per D-10
- **AdapterError/AdapterResult**: Fail-open error collection types
- **OAuthAdapter** (`src/adapters/oauth-adapter.ts`): Detects Continue with [Provider] buttons via text, href regex, data-attributes, meta tags, generic `/oauth/authorize` fallback (D-13); extracts scopes from URL `scope=` param and `data-scope` attributes, merged and deduplicated (D-14); covers Google, GitHub, Microsoft, Slack, Discord with known scope taxonomies (D-15)
- **AdapterRegistry** (`src/adapters/registry.ts`): Explicit array registration (D-22), priority-based execution ascending (D-23, OAuth=10), mutable context enrichment (D-24)

### Plugin Architecture (PLUGIN-01)
- **registerAdapter(type, factory)** (`src/plugins/adapter-plugin.ts`): Third-party adapter registration interface
- **registerAdapterInstance(adapter)**: Direct adapter registration
- **AdapterPlugin interface**: Full plugin initialization contract

### Test Fixture & Verification
- **test/fixtures/oauth-page.html**: HTML with Google, GitHub, Microsoft, Slack, Discord OAuth buttons plus generic fallback
- **test/oauth-adapter.test.ts**: Comprehensive tests verifying OAuthAdapter extracts correct ConsentEvent[] with capability objects, evidence references, and grantStatus='pending'

### CI/CD Pipeline
- **GitHub Actions workflow** (`.github/workflows/ci.yml`): Install, lint, typecheck, test, build, verify build output
- **Dependabot config** (`.github/dependabot.yml`): Weekly npm updates, grouped PRs, major version ignore

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added jsdom dependency for DOM testing**
- **Found during**: Task 1 test creation
- **Issue**: Vitest tests require JSDOM environment to parse HTML fixture and test OAuthAdapter DOM extraction
- **Fix**: Added `jsdom` and `@types/jsdom` to devDependencies in package.json
- **Files modified**: package.json
- **Commit**: 05db5c6

**2. [Rule 2 - Missing Critical Functionality] Added shared/errors.ts exports to adapter.ts**
- **Found during**: Task 1 implementation
- **Issue**: Adapter interface needs AdapterError, AdapterResult, PageContext, AdapterFactory types which are defined in shared/errors.ts
- **Fix**: Exported these types from adapter.ts and shared/index.ts for clean imports
- **Files modified**: src/adapters/adapter.ts, src/shared/index.ts
- **Commit**: 05db5c6

**3. [Rule 2 - Missing Critical Functionality] Fixed ConsentEvent factory import**
- **Found during**: Task 1 implementation
- **Issue**: createOAuthConsentEvent in consent-event.ts had circular import issue with capability.ts
- **Fix**: Used direct import for createOAuthCapability to avoid circular dependency
- **Files modified**: src/ir/consent-event.ts
- **Commit**: 05db5c6

**4. [Rule 2 - Missing Critical Functionality] Fixed TypeScript verbatimModuleSyntax issues**
- **Found during**: TypeScript compilation
- **Issue**: Type-only imports and re-exports required explicit `import type` and `export type` syntax
- **Fix**: Updated all type imports/exports across codebase
- **Files modified**: src/adapters/adapter.ts, src/adapters/oauth-adapter.ts, src/adapters/registry.ts, src/plugins/adapter-plugin.ts, src/shared/errors.ts, test/oauth-adapter.test.ts
- **Commit**: 05db5c6

**5. [Rule 2 - Missing Critical Functionality] Fixed Capability type narrowing in tests**
- **Found during**: Test execution
- **Issue**: TypeScript didn't narrow discriminated union types in test assertions
- **Fix**: Added `isOAuthCapability` type guard and explicit type assertions in test helper
- **Files modified**: src/ir/capability.ts, test/oauth-adapter.test.ts
- **Commit**: 05db5c6

**6. [Rule 2 - Missing Critical Functionality] Fixed ESLint flat config for TypeScript**
- **Found during**: Lint execution
- **Issue**: ESLint flat config required explicit TypeScript parser and plugin configuration
- **Fix**: Updated eslint.config.js with @typescript-eslint/parser and proper plugin setup
- **Files modified**: eslint.config.js
- **Commit**: 05db5c6

## Auth Gates

None encountered.

## Known Stubs

None — all implementations are complete and functional.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: dom-parsing | src/adapters/oauth-adapter.ts | Parses untrusted HTML content for OAuth detection — mitigated by known provider validation (T-01-01) |
| threat_flag: plugin-execution | src/plugins/adapter-plugin.ts | Third-party adapter factories execute with full DOM access — mitigated by factory signature validation and try/catch isolation (T-01-02) |

## Verification Status

| Check | Status |
|-------|--------|
| pnpm install | ✅ Passed |
| pnpm typecheck | ✅ Passed |
| pnpm lint | ✅ Passed |
| pnpm test (OAuth adapter) | ✅ 15/15 passed |
| pnpm build | ✅ Passed (ESM + CJS + DTS) |
| End-to-end tracer test | ✅ OAuthAdapter extracts ConsentEvent[] from oauth-page.html fixture |

## Next Steps

Proceed to Plan 01-02 for remaining adapters (Browser Permissions, Cookies, Policy, Terms).

---

*Generated: 2026-10-03*