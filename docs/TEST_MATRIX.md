# Test Matrix

This file maps product behavior to proof.

No product behavior has been defined or implemented yet. Do not mark a row
implemented until tests or validation evidence exist.

## Status Values

| Status | Meaning |
| --- | --- |
| planned | Accepted as intended behavior, not implemented |
| in_progress | Actively being built |
| implemented | Implemented and proof exists |
| changed | Contract changed after earlier implementation |
| retired | No longer part of the product contract |

## Matrix

| Story | Contract | Unit | Integration | E2E | Platform | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TBD | Add rows when story packets are created | no | no | no | no | planned | none |
| US-E12.1 | Admin role enabler: nav-config admin 7 items + DEFAULT_ROUTE + UserRole "admin" | yes | yes | no | yes | implemented | validate-grade-range.use-case.test.ts (13), get-setup-progress.use-case.test.ts (4), nav-config.test.ts admin block; mock repo; bun build clean |
| US-E12.1 | School Setup screen: grade range form (1≤min≤max≤13), narrowing warning, publish mode radio, onboarding progress, collapsible guide | yes | yes | no | yes | implemented | domain unit tests; mock repository integration; bun build + tsc clean; design-review pass |
| US-E12.2 | Academic Calendar: year/term CRUD, date-order validation, date-overlap validation, graded-term delete block, mock-first DI, accordion UI | yes | yes | no | yes | implemented | create-term (5), update-term (4), delete-term (3), create-year (4) unit tests (16 total); mock repository integration; bun build + tsc clean; a11y blocking issues fixed; design-review pass |
| US-E07.2 | --primary semantic var → --edu-primary-dark (#4570EA); WCAG AA 4.56:1 on white; all bg-primary/text-primary-foreground fixed globally via token remap | no | no | no | yes | implemented | No domain logic — pure CSS token change. tsc --noEmit clean (0 errors); bun build green; biome 0 issues; 130/130 Vitest tests pass; contrast ratio 4.56:1 verified (≥4.5:1 AA). ADR 0023 Accepted. |
| US-E07.5 | A11Y deferred cleanup (E07.3/E07.4): StatCard trend chip text-edu-success/error → text-edu-success-text/error-text (WCAG 1.4.3, 4.5:1 for text-xs); SecurityTab new-password Label+Input linked via useId() htmlFor/id (WCAG 1.3.1/4.1.2) | yes | no | no | yes | implemented | trendColorClass() unit tests (2 new, 7 total stat-card); 160/160 Vitest pass (28 files); tsc --noEmit clean; next build green. Decision 0027. |
| US-E12.7 | A11Y-006 sweep: text-edu-primary on normal text (non-icon, non-large-text) must achieve WCAG AA ≥4.5:1; icons/large-text confirmed passing at ≥3:1 | no | no | no | yes | implemented | 1 fix: calendar-screen.tsx:509 text-edu-primary → text-edu-primary-dark (4.56:1); 10 occurrences swept; tsc clean; 130/130 Vitest pass; bun build green; design-review pass |
| US-E12.8 | Admin route role guard: server-side RSC layout enforces role==="admin" before any /admin/* content renders; non-admin → redirect to DEFAULT_ROUTE; no token/unknown role → redirect to select-tenant; mock-first (NEXT_PUBLIC_USE_MOCK=true, NODE_ENV!==production) | yes | no | no | yes | implemented | decodeRoleClaim (8 tests), evaluateAdminAccess (7 tests); 145/145 Vitest pass; tsc --noEmit 0 errors; bun build green; tech-lead Approved; a11y Pass (no UI rendered) |

## Evidence Rules

- Unit proof covers pure domain and application rules.
- Integration proof covers backend enforcement, data integrity, provider
  behavior, jobs, or service contracts.
- E2E proof covers user-visible browser flows.
- Platform proof covers only shell, deployment, mobile, desktop, or runtime
  behavior that cannot be proven in lower layers.
- A story can be implemented without every proof column if the story packet
  explains why.
