---
name: pattern-reports-dashboard-4region
description: Multi-region client dashboard — thin RSC page + N independent useQuery via Server Action refs, segmented radio variant, anti-demo mock, CSV export descope
metadata:
  type: project
---

US-E03.1 principal-reports dashboard (`features/principal/{domain,infrastructure,presentation}/reports/`).

**Shape:** thin async RSC `page.tsx` resolves an `initialTerm` from `searchParams`
(clamp to a union default) and passes N Server Action refs as props — NO
`bootstrap/di` call, NO fetch in the page. Client container owns ALL TanStack
Query. Each independently-loading region = its own `useQuery` key
(`[...,region,termId]`); NO `placeholderData`/`keepPreviousData` (would flash
stale-filter data). Distinct keys per filter value = free stale-response discard
(no AbortController). Partial-failure isolation (one region errors, others
succeed) is a free consequence of N separate observers — do not join queries.
Regions are props-in leaves (`{status,data,errorKey,onRetry}`), QueryClient-agnostic
→ Storybook-testable without a provider.

**Repo convention here = THROWING** (`IXxxRepository` returns `Promise<Entity>`,
throws the failure union); Server Action is the catch→`{ok,data|errorKey}` boundary
(discipline precedent). Sibling `principal-teachers` uses `Result<T,F>` instead —
always follow the packet's interface signature, both conventions coexist.

**Anti-demo mock (spec §0):** NEVER port a mockup's forced-first-failure. Mock repo
constructor takes optional `now:()=>number` clock (default Date.now); a fresh
instance ALWAYS resolves; the only reject path is an explicit one-shot
`forceNextFailure(method, failure)` consumed on next call. Generating→ready via
`readyAt = now()+DELAY` re-evaluated on each `getPeriodicReports` call →
injected-clock unit-testable, no real timers. Module-level appended-rows store
(+`reset()` for test isolation) so generated rows survive DI-per-request instances.

**Poll:** extract `getReportsPollInterval(items): number|false` as a PURE predicate
(unit-test directly); wire `refetchInterval: (q)=>getReportsPollInterval(q.state.data)`.
No hook-level fake-timer test (flaky w/ QueryClient) — mock-clock test + predicate
test + E2E cover it.

**Segmented radio:** add `variant?: "default"|"segmented"` to BOTH `RadioGroup` +
`RadioGroupItem` in `components/ui/radio-group/` (edit in place, no fork, no token —
Radix `data-[state=checked]:` drives fill). Keeps native role=radiogroup a11y.

**Div-charts:** no chart lib; bars = tokens-only `bg-primary`/`bg-edu-warning` divs
with inline `style={{height:'%'}}` (dynamic value OK). `role="img"` + computed
`aria-label` (count via next-intl interp); EVERY value also a visible text label.
Low-attendance dual-flag = `bg-edu-warning` AND `font-extrabold text-edu-warning-text`
(weight differs → survives color-removed, AC-03.2).

**RegionEmptyState takes resolved title/desc strings**, NOT a `titleKey` — typed
next-intl `t()` rejects arbitrary `string` keys; region translates + passes strings.

**Export-Excel descope:** shipped client-side CSV (UTF-8 BOM, Excel-openable) not
binary .xlsx — a true .xlsx needs a zip/XML dep + ADR. Pure `buildReportsCsv(input,
labels)` is unit-tested; download trigger is a thin browser wrapper; labels passed
in (i18n boundary). Zero TanStack Query involvement.

**SB limit:** `useSearchParams` mock is static — `router.replace` doesn't update it,
so URL-driven filter-switch interaction tests can't run in Storybook (Playwright tier).
Prove per-region states + partial-failure statically instead. `nextjs:{appDirectory:true}`
gives the router/searchParams mocks. SB vitest runner works; add `timeZone` to
NextIntlClientProvider decorator when a component uses `useFormatter().dateTime`.
