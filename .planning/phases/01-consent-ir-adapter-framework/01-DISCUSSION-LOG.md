# Phase 1: Consent IR + Adapter Framework - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-03
**Phase:** 1-Consent IR + Adapter Framework
**Areas discussed:** Project Foundation, ConsentEvent Schema Design, Adapter Interface Contract, OAuth Adapter Detection, Cookie Classification, Policy/Terms Fetching, Adapter Registry & Composition

---

## Project Foundation

| Option | Description | Selected |
|--------|-------------|----------|
| Package Manager | pnpm / npm / yarn | ✓ pnpm |
| Build Tool | tsup / esbuild / tsc | ✓ tsup |
| Test Framework | Vitest / Jest | ✓ Vitest |
| Linting | ESLint + Prettier | ✓ ESLint + Prettier |
| TypeScript | Strict mode, ES2022, NodeNext | ✓ Strict |
| Project Structure | src/{ir,adapters,engine,ai,extension,shared} | ✓ This structure |

**User's choice:** "U can go ahead and decide for all technical requirements"
**Notes:** User delegated all technical foundation decisions to the agent

---

## ConsentEvent Schema Design

| Option | Description | Selected |
|--------|-------------|----------|
| String union types | Full type safety: 'oauth.google.drive.read' \| 'browser.location' | |
| Namespaced constants | Organized: Capability.OAuth.Google.Drive.Read | |
| Structured objects | Rich metadata: { type: 'oauth', provider: 'google', scope: 'drive.read' } | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal core only | website, consentType, capability, timestamp, grantStatus | |
| Core + context | Also require userAction, websiteStatedPurpose, evidence | |
| Comprehensive | Most fields required | ✓ uBlock-inspired minimal core |

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal | { source, selector?, url?, text? } | |
| Rich with confidence | Add confidence, extractionMethod, extractedAt | ✓ |

**User's choice:** Structured objects; "You pick, use ublockorigin as reference"; Rich with confidence
**Notes:** User referenced uBlock Origin for required fields approach

---

## Adapter Interface Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Raw Document | Full DOM access, main-thread only | ✓ |
| Serialized snapshot | HTMLSnapshot — worker-compatible | |

| Option | Description | Selected |
|--------|-------------|----------|
| Always async | Promise<ConsentEvent[]> — uniform | ✓ |
| Sync for DOM-only | Sync for simple, async for fetch | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fail-open + error collection | { events, errors } — pipeline continues | ✓ |
| Fail-closed | Throw on error — fail fast | |

**User's choice:** Raw Document; Always async; Fail-open + error collection

---

## OAuth Adapter Detection

| Option | Description | Selected |
|--------|-------------|----------|
| Button text + href patterns | Text matching + href regex | |
| Data attributes + meta tags | Explicit data-provider, data-scope | |
| All + generic fallback | Comprehensive + generic /oauth/authorize | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| URL params first | Parse scope= from OAuth redirect URL | |
| Data attributes first | data-scope on button/link | |
| Both, merge results | Extract from both, deduplicate | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Core 5 | Google, GitHub, Microsoft, Slack, Discord | ✓ |
| Core + extended | + Apple, Facebook, LinkedIn, GitLab | |
| Core + generic | Known + generic OAuth2 endpoint detection | |

**User's choice:** All + generic fallback; Both merge; Core 5 providers

---

## Cookie Classification

| Option | Description | Selected |
|--------|-------------|----------|
| Name-pattern heuristics | _ga→analytics, _fbp→ads — fast, zero deps | |
| External tracker lists | Disconnect/EasyPrivacy — more accurate | ✓ |
| Hybrid (patterns first) | Patterns for known, lists for unknown | |

| Option | Description | Selected |
|--------|-------------|----------|
| eTLD+1 via PSL | Correct subdomain handling | ✓ |
| Simple domain compare | Fast, wrong for subdomains | |

| Option | Description | Selected |
|--------|-------------|----------|
| CookieStore API | Native change notifications — Chrome 87+ | |
| Periodic polling | setInterval diff — universal | |
| Both: CookieStore + polling | Native where supported, fallback | ✓ |

**User's choice:** External tracker lists; eTLD+1 via PSL; Both CookieStore + polling

---

## Policy/Terms Fetching

| Option | Description | Selected |
|--------|-------------|----------|
| CORS proxy (r.jina.ai) | Auto-fetch via reader API | ✓ |
| Content script injection | Inject script, read DOM, postMessage | |
| Same-origin auto + user-triggered | Explicit user action for cross-origin | |

| Option | Description | Selected |
|--------|-------------|----------|
| Mozilla Readability | @mozilla/readability npm | ✓ |
| Custom DOM traversal | Policy-specific selectors | |

| Option | Description | Selected |
|--------|-------------|----------|
| IndexedDB with Cache-Control | Persistent, respects headers | ✓ |
| In-memory session only | Simple, privacy-first | |

**User's choice:** CORS proxy (r.jina.ai); Mozilla Readability; IndexedDB with Cache-Control
**Notes:** User initially unsure about fetch strategy — clarified cross-origin scenario

---

## Adapter Registry & Composition

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit array | registry.register([oauth, browser, ...]) | ✓ |
| Decorator-based | @Adapter({ type: 'oauth', priority: 1 }) | |
| Module discovery | Auto-scan src/adapters/ | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed priority order | OAuth→Browser→Cookie→Policy→Terms | |
| Configurable priority | Each declares priority, sorted | ✓ |
| Parallel + merge | All concurrent, results merged | |

| Option | Description | Selected |
|--------|-------------|----------|
| Immutable input only | Same PageContext, no mutations | |
| Mutable enrichment | Adapters can add to context | ✓ |
| Event bus | Emit/subscribe events | |

**User's choice:** Explicit array; Configurable priority; Mutable enrichment

---

## the agent's Discretion

- Exact TypeScript interface shapes for `PageContext`, `AdapterError`, `Capability` object structure
- Tracker list bundle format (JSON vs. compressed) and refresh interval
- r.jina.ai rate limit handling and fallback behavior
- Priority values for each adapter (suggested: OAuth=10, Browser=20, Cookie=30, Policy=40, Terms=50)

---

## Deferred Ideas

None — discussion stayed within phase scope
