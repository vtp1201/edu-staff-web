---
name: principal-reports-e03-baseline
description: US-E03.1 principal reports dashboard — confirmed no school-wide rollup exists anywhere; all-mock-first baseline and reuse-check method
metadata:
  type: project
---

US-E03.1 (Principal Reports Dashboard: stat cards, subject-average chart,
attendance-trend chart, periodic-reports table) integration map written to
`docs/stories/epics/E03-principal-reports/US-E03.1-principal-reports-dashboard/integration.md`.

**Finding:** grepped every existing `core`-adjacent feature (`academic-records`,
`attendance`, `discipline`, `grades`, `principal/teachers`) — all are
per-student or per-class-subject, none compute a school-wide rollup. The
existing `principal-dashboard.tsx` stat cards are **hardcoded literals**, not
wired to any use-case — further proof no aggregation endpoint/use-case exists
yet in this codebase. Declared **mock-first** (decision `0014`) for all 5
endpoints (summary, subject-averages, attendance-trend, report list, report
generation POST).

**Why:** task explicitly asked to check reuse-vs-net-new before declaring
mock-first — this is now the reference example of how to do that check (grep
`src/bootstrap/endpoint/*.ts` for the service's real endpoint surface + grep
`src/features/**` domain repos for the actual data shape returned, not just
whether a feature folder with a similar name exists).

**How to apply:** if a future story needs a school-wide/cross-class aggregate
in `core` (e.g. any other principal-level dashboard), expect the same gap —
check this file first before re-deriving the "no rollup exists" conclusion.
Recommendation pattern established here for two recurring BE-shaped ambiguities:
async status generating→ready → recommend **polling** (not push/SSE) when the
job is single-user/request-triggered rather than a live multi-user event
stream (SSE is reserved for `noti`, decision `0009`); export-to-file with no
confirmed BE endpoint → recommend **client-side generation** from
already-rendered data, defer library choice to `fe-state-engineer`/
`fe-nextjs-engineer`.
