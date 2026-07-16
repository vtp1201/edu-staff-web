---
name: conventions
description: Verified repo conventions I rely on when reviewing (tokens, mock lib, route guard status)
metadata:
  type: project
---

Confirmed facts (verify before citing if stale):

- `--edu-error-foreground: #ffffff` token EXISTS in `src/app/tokens.css` and is mapped in
  `globals.css` `@theme` as `--color-edu-error-foreground`. So `text-white` on an `bg-edu-error`
  surface is a token violation with a real fix (`text-edu-error-foreground`), not a missing-token case.
- `bootstrap/lib/mock.ts` exports `USE_MOCK` (env `NEXT_PUBLIC_USE_MOCK==="true"`) + `mockDelay(ms)`
  (no-op in production). Mock repos must `import "server-only"`, seed via module-level
  `structuredClone(SEED)`, and call `mockDelay()` per op. This is the established pattern.
- Route role-guard in `(app)/layout.tsx` is a deferred TODO — role is HARDCODED pending a separate
  story. Do NOT block an admin story for missing role gate; flag as known platform gap, not a regression.
- DI factory-per-request pattern: `makeRepo()` switches mock vs real via `USE_MOCK`; each use-case
  factory is `async` and awaits a fresh repo. Matches auth/attendance.
- Server actions return stable `errorKey: Failure["type"]`; presentation translates via
  `t.errors.<type>`. Failure union doubles as the i18n error catalogue (keys `errors.<type>` in both
  vi+en). When reviewing: every failure `type` MUST have a matching `errors.<type>` key in both files.
- Next.js App Router nested `layout`/`page` `params` include ALL dynamic segments above them in the
  URL path (accumulated), not just their own segment. So a layout at `[locale]/t/[tenant]/(app)/admin/`
  legitimately receives `{ locale, tenant }`. Route groups `(app)`/`(auth)` add NO param segment.
  Don't flag a nested layout reading parent `[locale]`/`[tenant]` params as wrong — it's correct.
- No `@testing-library/react` is installed. DOM/render coverage for components is done via Storybook
  interaction stories (browser mode), and pure logic is unit-tested as exported helpers in node env.
  So extracting a pure helper (e.g. `compactToneClass`) + Vitest on it, plus stories covering each
  variant/state, is the ACCEPTED proof shape — don't demand an RTL render test that the toolchain
  can't run. Composed components in `components/shared/<name>/` need an `index.ts` re-export + stories.
- **`{ raw: true }` placement trap (api-envelope.ts):** the http interceptor's `isRawCall` reads
  **config-level** `config.raw` (declared on `AxiosRequestConfig`), but repos (roster, teacher-dashboard)
  pass `{ params: { raw: true } }` — `raw` nested in `params` does NOT set `config.raw`, so at RUNTIME
  the interceptor unwraps the envelope before `parseEnvelope` sees it. Unit tests miss this because they
  mock `http.get` to return a full envelope, bypassing the interceptor. Cross-cutting (shared with roster
  precedent) → route to fe-lead, not a single-story block. Correct form is config-level
  `{ params: {...}, raw: true }`. Candidate ADR.
- **Paginated count via roster `.length`:** counting students by `roster.length` on a single `{limit:N}`
  page (teacher-dashboard `getTotalStudents`) silently undercounts when `meta.pagination.hasMore` is true.
  Flag any "sum/count from a list endpoint" that doesn't follow `nextCursor`.
- **`{raw:true}` trap is REPO-WIDE precedent** (confirmed US-E13.1): calendar, subject-catalogue,
  class-management, staffing, admin-roster, teacher-dashboard, teacher-class ALL pass
  `{ params: {..., raw: true } }` (raw nested in params, not config-level). So at runtime the
  interceptor unwraps before parseEnvelope. Since it's universal precedent, do NOT block a single
  new repo that copies it — route to fe-lead as a cross-cutting ADR. A new repo following this
  pattern is CONSISTENT, not a regression.
- **Role boundary via per-route action shadowing** (confirmed US-E13.3 class-log): one shared
  presentation screen (`ClassLogScreen`) takes all 4 actions as props; the teacher route's
  `actions.ts` wires create/submit to real use-cases but stubs approve/reject to
  `{ ok:false, errorKey:"unauthorized" }`, and the principal route does the inverse (stubs
  create/submit, wires approve/reject). This is sound server-side defense-in-depth — the privileged
  use-case is never reachable from the wrong role's route. ACCEPTED pattern; don't flag the "stub"
  actions as dead code — they enforce the boundary.
- **Auth/role guard (US-INFRA.2, decisions 0022/0024):** `bootstrap/auth-guard/` splits a PURE
  `evaluateAccess()` (`access-context.ts`, no `server-only`, unit-testable) from a `server-only`
  `requireRole()` wrapper (`require-role.server.ts`). Layout (RSC) does auth+tenant via
  `evaluateAccess`; Server Actions do role-only via `requireRole` (BEFORE `makeXxx()`), returning
  `{ ok:false, errorKey:"forbidden" }`. Mock-first: `decodeRoleClaim` returns "admin" in
  dev+mock; layout passes `tokenTenantId = urlTenant` in mock to skip tenant-mismatch. Watch:
  the barrel `index.ts` re-exports the server-only wrapper — safe only while no CLIENT component
  imports `evaluateAccess` from `@/bootstrap/auth-guard`; a client importer would break the build.
- **Prod mock build-guard (`next.config.ts`):** throws iff `NODE_ENV==="production" && NEXT_PUBLIC_USE_MOCK==="true"`
  — backstops the dev-only mock admin bypass. Treat as the required safety net for any mock-first auth shortcut.
- **Mock-first mutation boundary — Server Actions are ACCEPTED even when state-design says "direct to mock repo"**
  (confirmed US-E10.4 messaging): state-engineer's contract sometimes specifies social/mock mutations
  dispatch from client straight to the mock repo (no `'use server'`) until the real service ships.
  Engineers routinely implement them via Server Actions NOW (mutationFn calls the action; DI picks
  mock via `USE_MOCK`). This is the correct FINAL boundary and cleaner — do NOT block it; flag to
  fe-lead to reconcile the state-design doc. Watch instead for: planned optimistic updates silently
  dropped (e.g. createGroup/pinMessage listed as optimistic in state-design but implemented as
  post-confirm `onSuccess` / no `onMutate`) — that's a contract gap worth a SHOULD FIX.
- **Dynamic-swatch color exemption + `text-white` nuance** (US-E10.4): a color-picker swatch palette
  may legitimately carry raw hex `value`/`cssColor` when documented (e.g. `color-swatches.ts` ADR-exempt
  dynamic values rendered via inline `style`). But `text-white` on a checkmark over such a swatch is
  STILL a raw-color smell — prefer `text-edu-success-foreground` (==#fff) or document in the ADR.
  Don't hard-block the dynamic swatch values themselves when ADR-covered.
- **`role="status"` is shared by skeleton AND canonical empty-state** (confirmed US-E17.5 grades):
  `GradeBookSkeleton` carries `role="status"` and so does the canonical `emptyStatePattern` empty-state
  container. So a naive negative assertion `queryByRole("status")` in a LOADING/error story would
  falsely find the skeleton's status. The ACCEPTED proof shape for empty-state suppression ACs is
  positive per-branch stories in a mutually-exclusive render ternary (loading | !hasSelection | error |
  !gradeBook | populated) + distinguishing the canonical container by class (e.g. `.not.toContain("dashed")`).
  Don't demand a blanket `queryByRole("status")===null` — it's wrong given the skeleton overlap.
- **Canonical `EmptyState` shared component NOW EXISTS** at `components/shared/empty-state/`
  (created US-E17.4, 2026-07): presentation-only, no-CTA-by-default, callers pass already-translated
  strings (no `useTranslations` inside). Props: `icon: LucideIcon`, `title`, optional `body`, optional
  `cta`, `className` (merged via cn). Watch: the optional `body` renders `text-muted-foreground`
  text-sm — ~2.75:1 on a white card = WCAG AA FAIL for any future caller that passes `body`; discipline
  callers pass no body so it's latent, not triggered. Migrations still pending (inline copies remain in
  grades, exam-list, exam-result, exam-bank/lesson-bank empty, staff-leave, roster, parent-discipline
  ViolationsList, student-conduct lists) — pre-existing debt, migrate opportunistically, don't block a
  scoped story for them.
- **CSS-class-lock test = ACCEPTED TDD proof for pure-CSS/Tailwind-only stories** (confirmed
  US-E17.1 responsive stat grid): Vitest runs node-env with no `@testing-library/react`, so a
  pure class change (e.g. `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]`) is proven by
  `readFileSync` on the `.tsx` source + asserting the NEW class present AND the OLD/forbidden
  classes absent (`.not.toContain`), with column-count/viewport proof in Storybook `Viewport375`
  interaction stories. Non-vacuous requires BOTH the positive (new class) and negative (old class
  gone) assertions — a test that only checks the new class present is vacuous, flag it. Don't
  demand a render test the toolchain can't run.
- **RSC `page.tsx` importing `@/bootstrap/di/*` is ESTABLISHED repo-wide convention** — despite the
  CLAUDE.md layer table listing `app/page.tsx` as NOT importing `bootstrap/di/`, dozens of RSC pages
  (student/courses, student/grades, principal/*, shared/messages, shared/profile…) call
  `makeXxxUseCase()` directly for the initial server-side fetch. It's safe (DI is `server-only`, RSC is
  server-side, no client-bundle leak) and the plans explicitly direct it. Do NOT block a story for it;
  the table is doc-drift for fe-lead to reconcile, not a per-story defect.
- **Per-tab cold-mount query pattern (US-E11.7 assignments)** — a list keyed by an active filter tab
  where each tab must be its own loading→state cycle is done by (a) `<Region key={activeTab} .../>` so
  React unmounts the prior subtree+query, (b) per-tab `useQuery({ queryKey: keys.list(tab), gcTime:0,
  staleTime:0 })`, (c) default RSC-seeded tab gets `initialData` + `staleTime:30_000`. Non-optimistic
  submit mutation: no `onMutate`; `onSuccess` patches the active tab's cache directly then
  `invalidateQueries({ refetchType:"inactive" })` for the rest (they're `gcTime:0`-evicted anyway).
  This is a deliberate, sanctioned divergence from the sibling single-flat-key client-filter screen —
  don't flag it as inconsistency.
- **E18 BE-wiring hybrid-DI composite + permanent-mock stub = ACCEPTED pattern** (confirmed
  US-E18.4 class-management `listTeachers`, US-E18.5 admin-roster `getClassRoster`/`getSearchPool`):
  when a real `core` endpoint's wire shape can't render a shippable screen (e.g. `EnrollmentResponse`
  carries only ids — no name/dob/gender/status — and IAM has no public batch/by-id profile lookup),
  the real repo method is reduced to a documented dead-code stub (`return { ok:false, error:{ type:
  "unknown" } }`, no HTTP call) and the DI factory's `!USE_MOCK` branch delegates THAT method to a
  `MockRepository` instance via an anonymous `class implements IRepo` composite (real methods
  `.bind(real)`, mock-first methods `.bind(mock)`). Do NOT flag the dead stub as an unused-impl
  violation or demand the method be removed from the interface — it's the sanctioned precedent and
  the DI composite guarantees the stub is never invoked. Verify: (a) stub makes no HTTP call
  (`expect(http.get).not.toHaveBeenCalled()`), (b) DI routes it to mock in the real branch too,
  (c) a cross-repo ask is logged in EPIC-OVERVIEW.md for the missing BE field/endpoint.
- **E18 FULLY-BLOCKED (force-mock) DI factory = ACCEPTED pattern** (confirmed US-E18.8 staff-leave,
  US-E18.9 teaching-plan): when NO operation of a feature can go real (e.g. composite-key granularity
  mismatch, missing grid axis, and zero HTTP surface to edit an existing plan — teaching-plan's real
  `UpdateEntries()` is dead code, ground-truthed: only referenced in the entity def + its own Go unit
  test, no use-case/handler calls it), the DI factory's `makeRepo()` returns the Mock repo
  UNCONDITIONALLY (drops the `USE_MOCK`/`createServerHttpClient` branch entirely) and ALL real-repo
  methods become permanent blocked stubs that `throw`/return a failure without touching `this.http`.
  The real class + a ground-truthed `toFailure` taxonomy are kept correct + unit-tested for the day BE
  unblocks. Proof shape: `toFailure` matrix (all real codes + network + unknown fallback) + one
  "never-calls-http" guard per interface method (`expect(http.get/post).not.toHaveBeenCalled()`).
  Because there's no `!USE_MOCK` branch, playbook step 6 (`ensureFreshSession()`) is correctly N/A.
  Don't demand the real class be deleted or the endpoint constants removed — both are kept as
  documentation for the unblock, with a cross-repo ask logged (asks #13/#14). `core` error codes are
  UPPER_SNAKE on the wire (`codeFromKey` = `strings.ToUpper`), so branch `toFailure` on UPPER_SNAKE.
- **E18 "raw-id-in-display-name" fallback → filter fragility** (US-E18.11 timetable, and any epic
  screen where names fall back to raw id): when a mapper stores an id into a DISPLAY field because no
  name source exists (`teacherName: slot.teacherMemberId`, `subjectName: slot.subjectId`), any downstream
  logic that filters/matches on that display field (e.g. `getByTeacher` merge `slot.teacherName ===
  currentUserId`) works TODAY only because the field secretly holds the id. It silently breaks the day a
  real name join lands (the mapper comments usually anticipate exactly that join). Correct today + tested,
  so SHOULD FIX not blocking — but flag it: prefer matching on a preserved id field, or at minimum a code
  comment pinning the coupling. Don't approve it silently.
- **E18 hybrid partial-real repo — `getByClass` force-mock when its ONLY caller is itself blocked**
  (US-E18.11): a `RealX.getByClass` can be contract-correct + tested yet still routed to mock in the
  hybrid composite because its sole in-feature caller (`GetChildTimetableUseCase`) is permanently mock
  and feeds mock-fixture ids — a real call would 403/404. Verify the "only caller" claim by grepping the
  interface method's call sites before accepting the routing; here it held (one caller, the parent flow).
- `nav-config.ts` (`components/layout/app-shell/sidebar/`) is a PURE data/types module with NO
  `'use client'` — exports `Role`, `NAV_BY_ROLE`, `DEFAULT_ROUTE`, `ROLE_LABEL_KEY`. It imports
  lucide icon components as values but those are isomorphic, so it's safe to import from a server
  module. Still a layer-direction smell (bootstrap→components); the clean fix is to move shared
  routing constants (`DEFAULT_ROUTE`, `Role`) to `bootstrap/tenant` or a domain location.
