# Phase 1: Consent IR + Adapter Framework - Context

**Gathered:** 2026-10-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Define unified ConsentEvent schema and build pluggable adapter system with 5 core adapters (OAuth, Browser Permissions, Cookies, Privacy Policy, Terms of Service). This phase delivers the foundational data structures and extraction layer that all downstream phases (policy engine, AI reasoning, extension UI) depend on.

</domain>

<decisions>
## Implementation Decisions

### Project Foundation
- **D-01:** Package manager: **pnpm** — fast, disk-efficient, monorepo-ready — **Reversibility:** reversible
- **D-02:** Build tool: **tsup** — zero-config, ESM/CJS dual output, esbuild-based — **Reversibility:** reversible
- **D-03:** Test framework: **Vitest** — native TS, fast, Vite-compatible — **Reversibility:** reversible
- **D-04:** Linting: **ESLint + Prettier** with typescript-eslint, eslint-plugin-vitest — **Reversibility:** reversible
- **D-05:** TypeScript: **strict mode, ES2022 target, NodeNext modules** — maximum type safety — **Reversibility:** costly (migration would touch all files)
- **D-06:** Project structure: `src/{ir,adapters,engine,ai,extension,shared}` — matches phase boundaries — **Reversibility:** costly (refactor imports)

### ConsentEvent Schema Design
- **D-07:** Capability taxonomy: **Structured objects** — `{ type: 'oauth', provider: 'google', scope: 'drive.read' }` — pattern matching friendly, rich metadata, extensible — **Reversibility:** one-way (changes all adapter outputs and engine matching)
- **D-08:** Required fields (uBlock-inspired minimal core): `website`, `consentType`, `capability`, `timestamp`, `grantStatus`, `evidence[]` — mirrors uBlock filter decision needs — **Reversibility:** one-way (schema change cascades)
- **D-09:** Evidence references: **Rich with confidence** — `{ source, selector?, url?, text?, confidence, extractionMethod, extractedAt }` — enables inspectable decisions — **Reversibility:** costly (all adapters emit evidence)

### Adapter Interface Contract
- **D-10:** Input context: **Raw Document** — full DOM access, content scripts run on main thread — **Reversibility:** costly (worker migration would need snapshot serializer)
- **D-11:** Method signature: **Always async** — `extract(context): Promise<ConsentEvent[]>` — uniform, future-proof — **Reversibility:** reversible
- **D-12:** Error handling: **Fail-open + error collection** — return `{ events: ConsentEvent[], errors: AdapterError[] }` — one adapter failure doesn't block others — **Reversibility:** reversible

### OAuth Adapter Detection
- **D-13:** Detection patterns: **All + generic fallback** — button text, href regex, data-attributes, meta tags, generic `/oauth/authorize` detection — **Reversibility:** reversible
- **D-14:** Scope extraction: **Both, merge results** — URL `scope=` param + `data-scope` attributes, deduplicated — **Reversibility:** reversible
- **D-15:** Provider coverage: **Core 5** — Google, GitHub, Microsoft, Slack, Discord with known scope taxonomies — **Reversibility:** reversible (add providers later)

### Cookie Classification
- **D-16:** Classification: **External tracker lists** — Disconnect/EasyPrivacy — more accurate, maintainable — **Reversibility:** costly (switching to heuristics changes all classifications)
- **D-17:** First/third-party: **eTLD+1 via Public Suffix List** — correct subdomain handling — **Reversibility:** reversible
- **D-18:** Dynamic cookies: **CookieStore API + polling fallback** — native where supported, universal fallback — **Reversibility:** reversible

### Policy/Terms Fetching
- **D-19:** Cross-origin fetch: **CORS proxy (r.jina.ai)** — `r.jina.ai/http://url` returns extracted text — **Reversibility:** costly (privacy/dependency change)
- **D-20:** Content extraction: **Mozilla Readability** — `@mozilla/readability` npm, battle-tested — **Reversibility:** reversible
- **D-21:** Caching: **IndexedDB with Cache-Control** — persistent, respects headers, survives reloads — **Reversibility:** reversible

### Adapter Registry & Composition
- **D-22:** Registration: **Explicit array** — `registry.register([oauth, browser, cookie, policy, terms])` — simple, explicit — **Reversibility:** reversible
- **D-23:** Execution: **Configurable priority** — each adapter declares `priority: number`, sorted ascending — **Reversibility:** reversible
- **D-24:** Shared context: **Mutable enrichment** — adapters can add to context (e.g., OAuth adds `detectedProvider` for Policy adapter) — **Reversibility:** reversible

### the agent's Discretion
- Exact TypeScript interface shapes for `PageContext`, `AdapterError`, `Capability` object structure
- Tracker list bundle format (JSON vs. compressed) and refresh interval
- r.jina.ai rate limit handling and fallback behavior
- Priority values for each adapter (suggested: OAuth=10, Browser=20, Cookie=30, Policy=40, Terms=50)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Project context, core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — 38 v1 requirements (IR-01..05, ADAPTER-01..06 for Phase 1)
- `.planning/ROADMAP.md` — Phase 1 success criteria and dependencies
- `.planning/STATE.md` — Current phase status and decisions log

### External References (from discussion)
- uBlock Origin filter syntax — reference for policy engine design (Phase 2)
- OpenJev API (codiv.ai) — `https://codiv.ai/docs/quickstart` — System One classification
- Mozilla Readability — `@mozilla/readability` npm package
- Public Suffix List — for eTLD+1 detection (npm: `psl`)
- r.jina.ai — CORS proxy for cross-origin policy fetching
- CookieStore API — MDN: `https://developer.mozilla.org/en-US/docs/Web/API/CookieStore`
- Disconnect.me tracker list — `https://disconnect.me/trackerlist`
- EasyPrivacy filter list — `https://easylist.to/easylist/easyprivacy.txt`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project

### Established Patterns
- None — greenfield project

### Integration Points
- Phase 2 (Policy Engine) will consume `ConsentEvent[]` from adapter registry
- Phase 3 (AI Layer) will consume `ConsentEvent[]` for purpose inference, mismatch reasoning
- Phase 5 (Extension) content scripts will instantiate adapter registry and send events to background

</code_context>

<specifics>
## Specific Ideas

- uBlock Origin as architectural reference: programmable filtering engine, rule ecosystem, inspectability
- ConsentEvent schema should mirror what uBlock needs for a filter decision: what, where, when, action, evidence
- Structured capability objects enable pattern matching like `capability.type === 'oauth' && capability.provider === 'google'`
- Rich evidence references enable side panel "Why?" expandable with citations
- Mutable context enrichment allows OAuth adapter to tell Policy adapter which provider was detected

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 1-Consent IR + Adapter Framework*
*Context gathered: 2026-10-03*
