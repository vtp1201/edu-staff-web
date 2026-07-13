# US-E19.2 — Content Moderation — Implementation Plan

Lane: **high-risk**. Two independent deliverables sharing one report entity:
(1) shared `ReportContentDialog` (`components/shared/`, blocks US-E19.1), (2) net-new
`src/features/moderation/` + `(app)/principal/moderation` route. Ba-Lead role-gate
decision (principal ONLY, applies decision `0022`) is already resolved — no ADR
needed for that. Any OTHER authorization change is out of scope for `/fe` to decide.

## Precedent this plan reuses (do not rebuild)

- **Queue container pattern**: `src/features/audit-log/presentation/audit-log-screen/audit-log-screen.tsx`
  — RSC seeds page 1 → `useInfiniteQuery` + URL-synced filter draft + Server Action
  ref as `queryFn`. Mirror this exactly for the report queue (cursor pagination,
  debounced search → URL, `initialData` only when the RSC-rendered filter matches).
  NOTE: `src/features/audit-log/` is a **different bounded feature** (a generic
  compliance audit trail, `core`-adjacent) — structurally reused as a pattern only,
  its repository/entities are NOT shared with this story's moderation-audit tab
  (`INT-191-07`, `social` service, different entity shape).
- **Failure-union + `errorCodeOf`/`statusOf` branching**: `src/features/staff-leave/infrastructure/repositories/staff-leave.repository.ts`
  (`toFailure`) — branch strictly on `error.code`/`status`, never `error.message`.
  This is the exact pattern AC-1928.9/NFR-101 requires; mirror `toFailure` shape.
- **Mock-first with a "REAL but no openapi.yaml" service**: `staff-leave` built a
  real `Repository` class AND a `Mock*Repository` from day one, switched by
  `USE_MOCK` in the DI factory (`bootstrap/di/staff-leave.di.ts`). Do the same here
  — do not wait for BE confirmation to structure the code.
- **Destructive confirm dialog**: `src/components/shared/destructive-confirm-dialog/`
  already provides `role="alertdialog"`, focus-trap, destructive-variant button,
  controlled `open`. **Extend it** (new optional props) for Remove-content instead
  of forking — see Phase 4 decision below.
- **StatCard / StatCardSkeleton / StatusBadge / EmptyState**: `src/components/shared/{stat-card,stat-card-skeleton,status-badge,empty-state}/` — reuse verbatim for
  the 3 StatCards, skeleton, reason/status/action badges (icon+text via `StatusBadge`
  children = icon + label, never color-only), and the two empty-state copies.
- **RSC + Server Action page wiring**: `(app)/principal/discipline/{page.tsx,actions.ts}`
  — factory-per-request DI, `revalidatePath` after mutations, stable `errorKey`
  return shape (no i18n at this boundary).

## Consumer contract for US-E19.1 (and future US-E10.6)

`ReportContentDialog` (presentation, `components/shared/`) is **pure UI** — it
receives `{ kind, contentId, authorName, contentPreview }` + an `onSubmit` callback
prop and an `isSubmitting`/`error` state prop; it does **not** import DI or call
HTTP itself (presentation-layer rule). The actual `SubmitReportUseCase` +
`IModerationRepository.createReport` live in **this story's**
`src/features/moderation/domain/` and are exposed via
`bootstrap/di/moderation.di.ts::makeSubmitReportUseCase()`. **Each consumer route
(feed, messaging) writes its own thin `'use server'` action** that calls this
shared factory and wraps the dialog — Server Actions cannot cross feature/route
boundaries by convention, but the DI factory + use-case + repository are the one
shared implementation. Document this explicitly for `fe-lead` to relay to
US-E19.1's implementer.

## Phases

### Phase 1 — Shared `ReportContentDialog` (build FIRST — unblocks US-E19.1)

- Files: `src/components/shared/report-content-dialog/{report-content-dialog.tsx,report-content-dialog.i-props.ts,index.ts,report-content-dialog.stories.tsx,report-content-dialog.test.tsx}`.
- Props: `{ open, kind: "post"|"comment"|"message", authorName, contentPreview, isSubmitting, fieldError?: {message}, transientError?: {message}, infoMessage?: string, onSubmit: (input:{reason, note?}) => void, onCancel: () => void }` (host owns open/close + async state — same ownership model as `DestructiveConfirmDialog`).
- Reason list as a local const (`REPORT_REASONS`, ids `spam|inappropriate-language|bullying|misinformation|other` per integration.md's wire enum — NOT the design_src ids `language/bully/misinfo`, reconcile to the wire contract) with vi/en labels sourced from i18n, not the const.
- Test first (Vitest, jsdom-safe pure assertions à la `destructive-confirm-dialog.test.tsx`): Submit disabled until reason chosen; "Khác"/`other` requires non-empty note; Cancel fires `onCancel` without `onSubmit`; `aria-busy` while `isSubmitting`.
- Storybook interaction: open/select-reason/submit, "Khác" validation, cancel+focus-return, focus-trap (Tab loop), 422 field-error state, transient-error+retry state, 409 info-message state.
- i18n: `moderation.reportDialog.*` (reason labels, note placeholder/label, cancel/submit, toast, 422/transient/409 copy) in BOTH `vi.json`/`en.json`. Grep-verify no duplicate keys land under `feed.*`/`messaging.*` (NFR-104) before merge.
- Done when: component + stories + unit tests green, i18n keys present both locales, `bunx tsc --noEmit` clean.

### Phase 2 — Domain (`src/features/moderation/domain/`)

- Entities: `report.entity.ts` (`ReportEntity` — id, kind, contentId, contentPreview, authorId, authorName, reporterId, reporterName, reason, note?, status: "pending"|"dismissed"|"removed", createdAt, duplicateCount, resolvedBy?, resolvedAt?, resolveNote?), `report-detail.entity.ts` (extends with `fullContent`, `context`, `duplicateReports[]`), `moderation-stats.entity.ts` (`pendingCount, resolvedThisWeekCount, removedCount`), `audit-entry.entity.ts` (`entryId, actorId, actorName, action: "removed"|"dismissed", contentRef, reason, timestamp`).
- Failure: `moderation.failure.ts` — one union covering all 5 flows (mirrors `StaffLeaveFailure`'s shape):
  `{type:"validation", fields}` | `{type:"already-reported"}` | `{type:"not-found"}` | `{type:"already-resolved"}` | `{type:"forbidden"}` | `{type:"network-error"}`. Presentation maps `type` → `moderation.errors.<type>` i18n keys.
- Repository interface: `i-moderation.repository.ts` — `createReport`, `listReports(filter, cursor)`, `getReportDetail(reportId)`, `dismissReport(reportId)`, `removeContent({kind, contentId, reportId, reason?})`, `getModerationAuditLog(scopeId, cursor)`. All return `Result<T, ModerationFailure>` (no throw), consistent with `staff-leave`/`audit-log`.
- Use-cases (test-first, mock repo via `vi.fn()` like `reject-staff-leave.use-case.test.ts`):
  - `submit-report.use-case.ts` — client-side guard: reason required, note required iff reason="other"; else delegates to repo.
  - `list-reports.use-case.ts` — thin passthrough (filter/cursor validation only if needed) — **empty-positive vs empty-filtered is a PRESENTATION concern** (compares result length against `stats.pendingCount`), not domain; keep domain thin, don't over-engineer (YAGNI).
  - `dismiss-report.use-case.ts` — precondition doc-only (`status==="pending"` is enforced by button visibility + server 409, not re-validated client-side in the use-case — the use-case is a passthrough; over-guarding here would just duplicate server truth incorrectly since domain has no report object to check against at call time).
  - `remove-content.use-case.ts` — passthrough delegate; the *never-optimistic* rule lives in presentation (no client-side status mutation before the promise resolves), not the use-case.
  - `get-moderation-audit-log.use-case.ts` — thin passthrough.
- Done when: all use-case + failure-mapping unit tests green (red→green shown in commits).

### Phase 3 — Infrastructure (`src/features/moderation/infrastructure/`)

- DTOs: `report-response.dto.ts`, `report-detail-response.dto.ts` (adds `fullContent/context/duplicateReports`), `moderation-stats-response.dto.ts`, `audit-entry-response.dto.ts` — camelCase per `api-integration.md`.
- Mapper: `moderation.mapper.ts` (DTO → entity, pure functions, unit-tested).
- `toFailure(err): ModerationFailure` — **THE central high-risk proof point**: branches only on `errorCodeOf(err)`/`statusOf(err)` (`FORBIDDEN`/`NOT_PRINCIPAL`/403 → `forbidden`; `ALREADY_REPORTED`/409 on create → `already-reported`; `already-resolved`/409 on resolve/remove → `already-resolved`; `REPORT_NOT_FOUND`/404 → `not-found`; `VALIDATION_ERROR`/422 → `validation`; else/network → `network-error`). Add an explicit unit test that constructs an `ApiError`-shaped object with a **misleading `message`** (e.g. `code: "FORBIDDEN", message: "please retry"`) and asserts the mapping still returns `forbidden` — this is the code-review-verifiable proof AC-1928.9 demands.
- `ModerationRepository` (`server-only`, real, HTTP via `AxiosInstance`) implementing all 6 methods, same try/catch→`toFailure` shape as `StaffLeaveRepository`.
- `MockModerationRepository` (`server-only`, in-memory, mirrors `MockAuditLogRepository`'s cursor-slice pattern): seed ~15-20 `ReportEntity` fixtures spanning all 3 kinds/3 statuses/duplicate counts (incl. one `contentId` with 3 reports for UC-1930), a stats object derived from the seed, and an audit-log seed derived from the resolved subset. Mutate in-memory on dismiss/remove so a mock QA session can exercise the full flow (dismiss → stats/audit update; remove → 403 simulated for a specific fixture id to let Storybook/QA exercise AC-1928.6 deterministically). **No `failedOnce`-style demo toggle** — any induced-failure fixture is explicit and documented (e.g. `MOCK_FORBIDDEN_REPORT_ID` constant), not a hidden state machine (anti-demo rule).
- Done when: mapper + mock-repo unit tests green, plus the `toFailure` code/message-divergence test.

### Phase 4 — Bootstrap wiring

- `bootstrap/endpoint/moderation.endpoint.ts` — `MODERATION_EP` prefixed `/social/api/v1/...` (matching `MESSAGING_EP`'s existing convention, NOT integration.md's abbreviated `/api/v1/...` paths — same service, same prefix rule): `reports`, `reportById(id)`, `resolveReport(id)`, `moderateDeletePost(postId)`, `moderateDeleteComment(postId, commentId)`, `moderationAuditLog(scopeId)`.
- `bootstrap/di/moderation.di.ts` — `USE_MOCK`-switched `makeRepo()` + factories: `makeSubmitReportUseCase`, `makeListReportsUseCase`, `makeGetModerationAuditLogUseCase`, `makeDismissReportUseCase`, `makeRemoveContentUseCase`. (`getReportDetail` may be called directly off the repo from the RSC/action, same "no domain rule → skip the use-case" call made in `US-E14.4`'s plan — detail is a pure fetch.)
- **Recommend `NEXT_PUBLIC_USE_MOCK=true` as the working default for THIS story** until BE confirms the 3 open questions below (stats delivery shape, INT-191-03 existence, `resolveNote` requirement) — flag explicitly to `fe-lead`, do not silently assume REAL wiring is safe to demo against.

### Phase 5 — Presentation (`src/features/moderation/presentation/moderation-screen/`)

- `moderation-screen.i-vm.ts` — VM contract: `initialFilter`, `initialQueuePage` (+ `stats`), `initialErrorKey`, Server Action refs (`listReportsAction`, `getReportDetailAction`, `dismissReportAction`, `removeContentAction`, `getModerationAuditLogAction`), `viewerRole` (defensive — entry points still gate on it even though the route itself will be principal-reached in practice).
- Container `moderation-screen.tsx` (`'use client'`) — mirrors `audit-log-screen.tsx`: URL-synced status/type/search filter draft, `useInfiniteQuery` for the queue (`moderationKeys.list(filter)`), separate `useQuery` for detail sheet (`moderationKeys.detail(reportId)`, `enabled: open`), separate `useInfiniteQuery` for the audit tab (`moderationKeys.audit(scopeId)`). Two mutations (`useMutation` for dismiss, remove) invalidate `moderationKeys.lists()` + the specific `detail(reportId)` + (remove only) `moderationKeys.audit(scopeId)` on success — **never** an optimistic `setQueryData` for remove (NFR-101).
- Sub-components: `stat-row.tsx` (3× `StatCard`, whole-screen error fallback per AC-1923.2 means the CONTAINER decides to render `EduError` instead of the whole layout, not a stat-row-local error), `queue-filter-bar.tsx`, `report-table.tsx` + `report-card.tsx` (≤760px switch, reusing `StatusBadge` for reason/status), `report-detail-sheet.tsx` (focus-trapped `Sheet`, resolve-info vs footer-actions branch on `status`), `duplicate-report-list.tsx` (UC-1930, omitted/"0" when ≤1), `audit-timeline-tab.tsx` (read-only, icon+text action badges, NO action controls — enforce by simply never rendering any button in this subtree).
- **Confirm-remove dialog decision**: extend `DestructiveConfirmDialog` with two new optional props — `errorSlot?: { tone: "forbidden"|"transient"; message: string; onRetry?: () => void }` (renders inline below `body`; `forbidden` tone never renders a retry button even if `onRetry` were passed, enforced structurally not just by omission) — rather than forking a new dialog. This is an EXTENSION of an existing shared component (component-organization rule: composed, ≥1 existing consumer already, extend via prop not fork). Flag to `fe-component-architect`/`fe-nextjs-engineer` as a required prop-contract addition, not a new component.
- Empty-positive vs empty-filtered: computed in the container by comparing `queue.length === 0` against `stats.pendingCount === 0` (true-empty) vs `stats.pendingCount > 0` (filtered-empty) **only when the active tab is "pending"**; the "Đã xử lý"/"Tất cả" tabs with zero results always render the neutral filtered-tone copy (no positive variant exists for them per design-spec).
- Done when: Storybook states covering all 5 UI states + both empty variants + detail-sheet pending/resolved/404/transient + dismiss happy/409/403/transient + remove happy/403(no-retry)/409/transient(retry) + audit read-only/empty + duplicate present/absent.

### Phase 6 — App wiring (`(app)/principal/moderation/`)

- `page.tsx` (RSC) — reads `tab`/`status`/`type`/`search`/`cursor` search params (URL-first, per audit-log precedent), calls `makeListReportsUseCase().execute(...)` + repo `getModerationAuditLog` conditionally, passes VM + action refs to `ModerationScreen`. Soft-fail to VM's `initialErrorKey` (not a thrown 500) so the client container can retry — mirror `discipline/page.tsx`'s try/catch-to-empty pattern but preserve the error key (discipline currently swallows to silently-empty; moderation MUST preserve `AC-1927.4`'s error-not-empty distinction, so do NOT copy the silent-swallow verbatim — note this divergence explicitly in code comments).
- `actions.ts` (`'use server'`) — `listReportsAction`, `getReportDetailAction`, `dismissReportAction`, `removeContentAction`, `getModerationAuditLogAction`; each calls the matching DI factory/repo method, `revalidatePath` only where a full RSC re-render benefit exists (queue path) — mutations otherwise rely on client-side query invalidation (TanStack), not `revalidatePath`, to avoid a stale-then-flash double-render (consistent with `audit-log`'s pattern of Server-Action-as-`queryFn`, not Server-Action-as-page-refresh).
- No new route guard needed: existing `(app)/layout.tsx` only enforces tenant/auth, not per-route role (confirmed — no existing principal-only page has an extra role check beyond nav-hiding + server 403). Follow that convention; UI entry-point hiding (`viewerRole === "principal"`) + server 403 IS the full defense-in-depth per NFR-101 — do not invent a new layout guard mechanism for this one route.

### Phase 7 — i18n

- New namespace `moderation.*` in `messages/{vi,en}.json`: stat labels, tab labels, filter labels/placeholders, table headers, status/reason badge labels, detail-sheet section headers, confirm-remove dialog copy (irreversibility + notify-author, forbidden/transient error copy), toasts, audit-tab copy, empty-state copies (positive + filtered + audit-empty), error copy. Plus `moderation.reportDialog.*` from Phase 1. Add BOTH locales in the same commit per file; verify with `bunx tsc --noEmit` (typed messages catch missing keys).

### Phase 8 — Storybook + test proof sweep (per TEST_MATRIX)

- Confirm every row in story.md's Validation table has a corresponding test/story before flipping `implemented`: unit (use-cases + failure mapping incl. the code-vs-message divergence test), integration (repository↔HTTP contract + the explicit 403-vs-transient-by-code test), Storybook interaction stories per UC listed above, manual keyboard-only pass noted in PR/story evidence.

## High-risk checklist (explicit — do not let this get lost in the phase list)

- [ ] AC-1928.6/1928.9: `toFailure` unit test with mismatched `code`/`message` proves branch is code-only.
- [ ] Never-optimistic remove: `useMutation` for remove has NO `onMutate`/optimistic `setQueryData`; a Storybook/interaction test asserts content still shows non-removed state while the mutation's promise is pending (mock a delayed resolver).
- [ ] Every dismiss/remove path is proven to produce a retrievable audit entry: in mock-repo, dismiss/remove mutate the in-memory audit seed too (not just report status), and a Storybook/interaction test performs remove → switches to audit tab → asserts the new entry appears.
- [ ] Empty-positive vs empty-filtered: two distinct Storybook stories + a unit/interaction assertion they render different copy given the same `queue.length === 0`.
- [ ] Anti-demo: grep the mock repo + presentation for any `failedOnce`/toggle-style induced-failure state; only fixed, documented fixture IDs are allowed to represent forced error paths.
- [ ] Remove entry point rendered only for `principal` — Storybook story for a non-principal `viewerRole` prop shows no "Gỡ nội dung" button (defense-in-depth demonstration even though route access itself is the real gate).

## Open questions to escalate (NOT resolved by this plan — carried from spec.md §8)

1. **Stats delivery shape** (embedded in `GET /reports` response vs separate endpoint) — blocks exact `moderation-stats.mapper` shape; plan assumes embedded per integration.md's current best guess, but this needs BE confirmation before Phase 3 is "real"-wired (mock is unaffected).
2. **INT-191-03 existence/path** (`GET /api/v1/reports/{reportId}`) — if BE says detail is derivable from the list row instead, Phase 5's detail-sheet loading AC collapses to instant-render; plan as-is assumes a real fetch exists.
3. **`resolveNote` on dismiss (INT-191-04) and remove (INT-191-05)** — required or optional, and whether Remove needs its own resolution note distinct from the report's original reason. This affects the confirm-remove dialog's field set (Phase 5) — plan currently treats it as optional free text with NO required-field validation; if BE says required, Phase 2's `remove-content.use-case.ts` gains a validation branch.
4. **`INT-191-07`'s `roomId` semantics** — blocks the audit-tab query-key/scope design (Phase 5's `moderationKeys.audit(scopeId)`) — plan currently assumes a single tenant-level scope id is passed (per requirements.md's single-tenant-principal assumption) with NO cross-scope aggregation; if BE clarifies otherwise this could require multiple calls.
5. **Duplicate self-report (409) UX** — auto-close vs explicit dismissal on the informational message (AC-1922.5). Plan implements **explicit dismissal** (consistent with "no toast on non-success paths") as the recommended default, pending product sign-off — flag to `fe-lead`/`ba-lead` before Phase 1 ships if this needs to change.
6. **Search input max-length** — low-risk, no client-side cap planned unless BE confirms one.

None of these block starting Phase 1/2 (dialog contract + domain are independent of the unresolved wire details); they DO gate Phase 3's "real" repository being demo-safe — hence the `USE_MOCK=true` recommendation in Phase 4.

## Sub-tasks (for `fe-component-architect` / `fe-state-engineer` / `fe-nextjs-engineer`)

- `fe-component-architect`: confirm the `DestructiveConfirmDialog` extension shape (Phase 5) and the `ReportContentDialog` prop contract (Phase 1) before implementation — both are shared-component surface changes.
- `fe-state-engineer`: design `moderationKeys` (list/detail/audit) + invalidation graph (dismiss/remove → which keys) — non-trivial cross-entity invalidation (stat counts live inside the list query's payload per current assumption, so a dismiss/remove must invalidate `lists()`, not just `detail()`).
- `fe-nextjs-engineer`: implements Phases 1-8 in order, TDD per phase; Phase 1 merges/lands (or is at least contract-frozen) before US-E19.1 depends on it per the parallel-workflow dependency rule.
