# ConsentLens

## What This Is

An open-source AI-powered consent layer for the web. A programmable consent engine that unifies fragmented consent mechanisms (OAuth, browser permissions, cookies, privacy policies, terms of service) into a single inspectable, controllable system. Users express intent through declarative policies; open-weight AI provides semantic understanding of purpose/access mismatches. The deterministic policy engine enforces decisions — AI never silently overrides user rules.

**Built for community-driven extensibility:** Like uBlock Origin, every component is designed for user customization and community contribution. OAuth providers, cookie classifiers, policy extractors, rule packs, and AI models are all pluggable — anyone can add new providers, write custom rules, create policy packs, or swap AI backends without modifying core code.

## Core Value

**Users understand and control what they're consenting to across all web consent surfaces, with AI explaining mismatches between stated purpose and requested access — all through a fully customizable, community-extensible platform.**

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Unified Consent IR: Common schema representing OAuth scopes, browser permissions, cookie categories, policy clauses, terms clauses
- [ ] Adapter System: Pluggable extractors for each consent mechanism (OAuth, cookies, browser perms, policies, terms)
- [ ] Deterministic Policy Engine: uBlock-style declarative rules with precedence, exceptions, domain matching
- [ ] AI Semantic Layer: Purpose inference, permission interpretation, policy extraction, purpose/access reasoning
- [ ] OpenJev Integration: Fast structured classification (allow/ask/deny, excessiveness, purpose match) with confidence
- [ ] Cross-Source Reasoning: Unified consent view combining all mechanisms on a page
- [ ] Chrome Extension: Content scripts + sidebar UI demonstrating full loop
- [ ] Consent History: Local ledger of consent events with audit capability
- [ ] Policy Packs: Built-in profiles (Balanced, Strict, Essential, No AI Training, Paranoid)
- [ ] Inspectable Decisions: "Why was this blocked/allowed/asked?" with evidence chain
- [ ] **Plugin Architecture:** All adapters, classifiers, and engines expose plugin interfaces for community extensions
- [ ] **Community Rule Packs:** Standardized format for sharing/distributing rule packs (JSON + metadata)
- [ ] **Provider Registry:** Extensible OAuth provider registry — add new providers via config, no code changes
- [ ] **Custom Classifier Support:** Users can add custom cookie/classification rules via config files
- [ ] **AI Model Interchange:** Swappable AI backends (OpenJev, local LLMs, remote APIs) via common interface
- [ ] **Import/Export:** Full configuration portability (rules, packs, providers, classifiers, history)

### Out of Scope

- Real-time network request interception (declarativeNetRequest limitations) — Use DOM/content analysis instead
- Mobile browser support — Desktop Chrome only for hackathon
- Multi-browser (Firefox, Safari) — Chrome Manifest V3 first
- Remote policy sync/server — Local-first only (but import/export enables sharing)
- Legal advice generation — Summarize only, no legal conclusions
- Automatic revocation of existing OAuth grants — Read-only analysis
- Community rule repository hosting — Local packs only, distribution via GitHub/Git (standard OSS)
- Fine-tuning/custom models — Use existing open-weight models via OpenJev/local

## Context

- Hackathon: 6 hours remaining, solo developer
- Challenge: "Best Open-Source AI Project" — must use open-weight AI meaningfully
- Must publish public GitHub repo with OSI license
- Inspiration: uBlock Origin's programmable filtering engine, rule ecosystem, inspectability
- OpenJev API (codiv.ai) provides System One models for fast structured classification with confidence scores
- Target: Demoable Chrome extension showing full consent analysis loop on multiple example sites

## Constraints

- **Time**: 6 hours — prioritize depth over breadth, engine first
- **Team**: Solo — no parallelization, sequential execution critical
- **AI**: Open-weight models only (OpenJev for classification, local/remote LLMs for reasoning)
- **Architecture**: Local-first privacy, deterministic enforcement, AI as semantic layer only
- **Extension**: Manifest V3, content scripts + background service worker + side panel
- **License**: MIT or Apache-2.0

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| uBlock-style policy syntax | Proven, familiar, composable, inspectable | — Pending |
| OpenJev for fast classification (choice/score/noul) | Sub-second structured decisions with confidence | — Pending |
| Deterministic engine + AI semantic layer separation | Trust, inspectability, user control | — Pending |
| Consent IR as unified schema | Enables cross-source reasoning, adapter composability | — Pending |
| Engine-first architecture | Core logic reusable, testable, extensible | — Pending |
| All consent types in MVP scope | Demonstrates unified vision, differentiation | — Pending |
| Side panel UI (not popup) | Persistent, inspectable, shows full consent context | — Pending |
| Plugin architecture for all extension points | uBlock-style community extensibility | — Pending |
| Provider registry over hardcoded providers | Anyone can add OAuth providers via config | — Pending |
| Standardized rule pack format | Community sharing, import/export | — Pending |

---

*Last updated: 2026-10-03 after initialization*