# US-E20.1 — Admin Parent–Student Link Management — Implementation Plan

Lane: **high-risk**. Branch `feat/us-e20.1-admin-parent-links` (already claimed).
Net-new feature module `src/features/admin/parent-links/` + route
`(app)/admin/parent-links`. Reuses the existing `(app)/admin/layout.tsx` RSC
guard (decision `0022`/`0024`) — **no new route guard**. All 6 endpoints are
mock-first (`core` doesn't exist; `iam` search-by-role also mock-first
pending contract, per integration.md).

## Precedent this plan reuses (do not rebuild)

- **Mock-first + `USE_MOCK`-switched DI factory**: `src/bootstrap/endpoint/admin-roster.endpoint.ts`,
  `discipline.endpoint.ts`, `academic-records.endpoint.ts`, `audit-log.endpoint.ts` — same
  `/core/api/v1/...` path convention + doc-comment stating "no real endpoint exists yet."
  Mirror exactly for `PARENT_STUDENT_LINKS_EP`.
- **Queue container pattern (list + filter + cursor)**: `src/features/audit-log/presentation/audit-log-screen/audit-log-screen.tsx`
  — RSC seeds page 1 → client container reads URL-synced filter draft → Server
  Action ref as `queryFn`. Mirror this for the links table (search `q` + `classId`,
  cursor pagination, `initialData` only when RSC filter matches URL).
- **`requireRole(["admin"])`-per-Server-Action**: `admin/grades/approval/actions.ts`
  (`src/app/[locale]/t/[tenant]/(app)/admin/grades/approval/actions.ts`) — the
  `guard = await requireRole(["admin"]); if (!guard.ok) return {ok:false, errorKey:"forbidden"}`
  shape. Reuse verbatim for `createParentStudentLinkAction` and
  `unlinkParentStudentLinkAction`.
  **Gap to close (read `src/bootstrap/auth-guard/require-role.server.ts` — it is
  explicitly ROLE-ONLY**: "tenant enforcement stays in layout... Server Actions
  have no URL tenant param." That is **insufficient** for AC-005.5's tenant-match
  half of the high-risk assertion. Fix: decode `tenantId` server-side via
  `decodeTenantClaim(token)` (already exists, `src/bootstrap/lib/jwt.ts:85`) in
  the DI factory (not a new guard) and pass `{ role, tenantId }` as an explicit
  authorization context into `unlinkParentStudentLink`/`createParentStudentLink`
  use-cases, which the repository re-validates against the link's own
  `tenantId` before deleting/creating. This is the mechanism that makes
  AC-005.5 testable pre-`core` (mock repo compares caller `tenantId` against the
  seeded link's tenant and rejects on mismatch) — **do not rely on `requireRole`
  alone for this AC**, it only proves the role half.
- **Destructive dialog + inline error slot**: `src/components/shared/destructive-confirm-dialog/`
  already has `errorSlot?: { tone: "forbidden"|"transient"; message; onRetry? }`
  (added in US-E19.2, structurally suppresses retry for `forbidden`). **Reuse
  directly, no fork** for `PLUnlinkDialog` — it already covers AC-005.2 (danger
  button, focus trap, focus-return), AC-005.6/.8 (403 vs network error tone).
  Only need to supply title/body/confirmLabel copy (with `{parent}/{student}/{class}`
  interpolation) and wire `errorSlot` from the mutation's failure branch.
- **`StatusBadge` (icon+text, tone-mapped)**: `src/components/shared/status-badge/`
  — reuse for relationship (father/mother/guardian) and consent
  (agreed/pending/declined) badges. Tone mapping per design-spec `parentLinks.table.relationBadges`/`consentBadges` (§ below).
- **`EmptyState`**: `src/components/shared/empty-state/` — reuse for both
  `PLEmpty` variants (no-filter vs filtered), presentation passes already-translated strings.
- **`errorCodeOf`/`statusOf` + `toFailure` branch-on-code pattern**: `src/features/staff-leave/infrastructure/repositories/staff-leave.repository.ts`
  — mirror for `toFailure(err): ParentStudentLinkFailure`, and (high-risk
  requirement) add the explicit unit test asserting the mapping is code-only
  even with a misleading `message` (same discipline as US-E19.2 Phase 3).
- **No existing Combobox primitive.** Grepped `components/ui/`, `components/shared/`,
  and every feature for `role="combobox"`/typeahead — nothing exists (the only
  `Popover` usages found are `DateField`/reaction-picker/scope-tabs, none are a
  searchable listbox). This story needs a genuinely new composed
  `PLCombobox` (Popover + `bun ui:add command` — shadcn's `cmdk`-based Command
  primitive is the correct backing, not a fresh build from scratch). Flag to
  `fe-component-architect` explicitly (see §3).

## 1. Summary

Admin-only screen (`(app)/admin/parent-links`) to view/search/filter/create/
unlink parent-student links for the tenant, with read-only consent-status
display. New feature module `src/features/admin/parent-links/`. High-risk
lane because Unlink revokes a parent's data-visibility grant and must be
independently re-authorized server-side (role **and** tenant match), not just
gated by the existing route guard. "Done" = all 7 UCs (table load w/ 2 empty
variants, search+filter, create w/ duplicate rejection, read-only detail,
high-risk unlink, role-gate, mobile card-list <760px) proven per
`story.md`'s Validation table, plus the dedicated forged-role/cross-tenant
repository test for AC-005.5.

**Key decisions surfaced (not architecture-neutral, but no ADR needed — confirm with `fe-lead`):**
- Tenant-match re-check for Unlink/Create is implemented via
  `decodeTenantClaim` + explicit authorization context passed into the
  use-case/repository (see gap above) — this is a security-critical
  implementation detail `fe-tech-lead-reviewer` must verify, not a design-system
  or contract change, so no ADR filed. If `fe-lead` disagrees, flag before Phase 2.
- `PLCombobox` is new shared-shape UI (Popover+Command) — no token/architecture
  decision, but is non-trivial component-architecture work (see §3).

## 2. Phased breakdown

### Phase 1 — Domain (`src/features/admin/parent-links/domain/`)

- Entities: `parent-student-link.entity.ts` (`ParentStudentLink` per spec.md §6
  shape), `parent-student-consent.entity.ts` (`ParentStudentConsent`,
  disciplineAlerts/absenceAlerts/gradeAlerts), `link-candidate.entity.ts`
  (shared shape for student/parent search results: `memberId, fullName,
  avatarUrl, className?/phone?`).
- Failure: `parent-student-link.failure.ts` — union: `{type:"validation", fields}`
  | `{type:"already-linked"}` (duplicate pair, FR-004) | `{type:"not-found"}`
  (404 race, AC-005.7) | `{type:"forbidden"}` (403, AC-005.5/.6 — role or
  tenant mismatch) | `{type:"network-error"}`.
- Repository interface: `i-parent-student-link.repository.ts` —
  `listLinks(filter: {q?, classId?, cursor?, limit?}): Result<{items, nextCursor, hasMore}, Failure>`,
  `createLink(input: {studentId, parentId, relationship, note?}, authCtx): Result<ParentStudentLink, Failure>`,
  `unlinkLink(linkId, authCtx): Result<void, Failure>`,
  `getLinkConsentDetail(studentId, parentId): Result<ParentStudentConsent, Failure>`,
  `searchStudentCandidates(q, classId?): Result<LinkCandidate[], Failure>`,
  `searchParentCandidates(q): Result<LinkCandidate[], Failure>`.
  **`authCtx: { role: UserRole; tenantId: string }` is a required param on
  `createLink`/`unlinkLink`** — this is the explicit, testable seam for the
  high-risk re-check (not implicit in the http client).
- Use-cases (test-first, mock repo via `vi.fn()`):
  - `list-parent-student-links.use-case.ts` — thin passthrough.
  - `create-parent-student-link.use-case.ts` — client-side guard only for
    required fields (studentId, parentId, relationship); delegates
    duplicate/role/tenant checks to repo.
  - `unlink-parent-student-link.use-case.ts` — passthrough delegate; **no
    optimistic state** lives here (that rule is enforced in presentation's
    mutation, not the use-case — mirrors US-E19.2's `remove-content.use-case.ts` note).
  - `get-link-consent-detail.use-case.ts`, `search-student-candidates.use-case.ts`,
    `search-parent-candidates.use-case.ts` — thin passthroughs.
- **Test first**: `unlink-parent-student-link.use-case.test.ts` covering
  ok/forbidden(role)/forbidden(tenant-mismatch)/not-found/network-error branches
  against a mock repo; `create-parent-student-link.use-case.test.ts` covering
  ok/already-linked/validation/network-error.
- Done when: all use-case + failure-mapping unit tests green.

### Phase 2 — Infrastructure (`src/features/admin/parent-links/infrastructure/`)

- DTOs: `parent-student-link-response.dto.ts`, `parent-student-consent-response.dto.ts`,
  `link-candidate-response.dto.ts` — camelCase.
- Mapper: `parent-student-link.mapper.ts` (DTO→entity, pure, unit-tested).
- `toFailure(err): ParentStudentLinkFailure` — branches on `errorCodeOf`/`statusOf`
  only (`LINK_ALREADY_EXISTS`/409→`already-linked`; `VALIDATION_ERROR`/422→`validation`;
  `RESOURCE_NOT_FOUND`/404→`not-found`; `FORBIDDEN_ACTION`/403→`forbidden`; else→`network-error`).
  **High-risk proof**: add the misleading-`message`-with-correct-`code` unit
  test (same discipline as US-E19.2 Phase 3) proving the branch is code-only.
- `ParentStudentLinkRepository` (`server-only`, real HTTP shape, unused until
  `core` ships — keep structurally ready per decision `0014`).
- `MockParentStudentLinkRepository` (`server-only`, in-memory):
  - Seed ≥8 links across ≥2 classes, mixed `consentStatus` (agreed/pending/declined),
    ≥1 with a `note`, each carrying its own `tenantId` for the cross-tenant test.
  - `createLink`: reject duplicate `(studentId,parentId)` → `already-linked`;
    reject when `authCtx.role !== "admin"` → `forbidden` (defensive, per spec.md
    high-risk §1); reject when `parentId` candidate isn't in the parent-search
    seed pool → `validation` (per FR-010/NFR-008).
  - `unlinkLink`: **the load-bearing test fixture** — reject when
    `authCtx.role !== "admin"` OR `authCtx.tenantId !== link.tenantId` →
    `forbidden`, *before* checking existence; reject with `not-found` if
    `linkId` absent from the seed (simulates the 404 race, AC-005.7); otherwise
    delete from in-memory store.
  - Search pools: separate in-memory student/parent-role candidate arrays,
    parent pool pre-filtered to `role: "parent"` + a single seeded `tenantId`
    (never returns a second tenant's members — proves NFR-008 client-independently).
  - No `failedOnce`-style toggle (anti-demo rule) — any forced-error path is a
    fixed, documented fixture id (e.g. a constant `FORBIDDEN_TENANT_ID` used only
    by the dedicated test, not surfaced in Storybook as a hidden state machine).
- **Test first**: `mock-parent-student-link.repository.test.ts` — MUST include
  a test that calls `unlinkLink(existingLinkId, { role: "teacher", tenantId: seedTenantId })`
  directly (forged non-admin role) and asserts `forbidden`, **and** a second test
  calling `unlinkLink(existingLinkId, { role: "admin", tenantId: "other-tenant" })`
  (cross-tenant admin) and asserts `forbidden` — this is exactly AC-005.5's
  "not merely confirming the button is hidden" requirement.
- Done when: mapper + mock-repo tests green including both forged-context tests.

### Phase 3 — Bootstrap wiring

- `bootstrap/endpoint/parent-student-link.endpoint.ts` — `PARENT_STUDENT_LINKS_EP`:
  `list: "/core/api/v1/parent-student-links"`, `create` (same path, POST),
  `byId(linkId)` (DELETE), `consents: "/core/api/v1/parent-student-links/consents"`,
  plus `STUDENT_SEARCH_EP`/reuse or extend `iam-member.endpoint.ts` for parent
  search (see integration.md INT-005/006 — both explicitly mock-first, doc-comment
  matching `admin-roster.endpoint.ts`'s "no core endpoint exists" precedent).
- `bootstrap/di/parent-student-link.di.ts` — `USE_MOCK`-switched `makeRepo()`;
  factories `makeListParentStudentLinksUseCase`, `makeCreateParentStudentLinkUseCase`,
  `makeUnlinkParentStudentLinkUseCase`, `makeGetLinkConsentDetailUseCase`,
  `makeSearchStudentCandidatesUseCase`, `makeSearchParentCandidatesUseCase`.
  **This factory is where `decodeRoleClaim`/`decodeTenantClaim` are read from
  the access token and assembled into `authCtx`** — passed by the Server Action
  into `execute(input, authCtx)` for create/unlink only (read-only use-cases
  don't need it, they're already route-gated for viewing).
- Recommend `NEXT_PUBLIC_USE_MOCK=true` as the working default (all 6 endpoints
  mock-first per integration.md — no exception).

### Phase 4 — Presentation (`src/features/admin/parent-links/presentation/parent-links-screen/`)

- `parent-links-screen.i-vm.ts` — VM contract: `initialFilter` (`q`, `classId`),
  `initialPage` (items + pagination), `initialErrorKey`, Server Action refs
  (`listLinksAction`, `createLinkAction`, `unlinkLinkAction`,
  `getLinkConsentDetailAction`, `searchStudentCandidatesAction`,
  `searchParentCandidatesAction`), `classOptions`.
- Container `parent-links-screen.tsx` (`'use client'`) — mirrors
  `audit-log-screen.tsx`: URL-synced `q`+`classId` filter draft,
  `useInfiniteQuery` for the table (see §4 query-key design), separate
  `useQuery` for the detail dialog's consent sub-fetch
  (`enabled: detailDialogOpen`), two `useMutation`s (create, unlink).
  **Unlink mutation has NO `onMutate`/optimistic `setQueryData`** — row stays
  until success (AC-005.4); a Storybook/interaction test with a delayed
  resolver must assert the row is still present while the mutation is pending.
- Sub-components (feature-local for now, see §3 for shared-promotion candidates):
  `pl-skeleton.tsx` (5-row shimmer, reuse discipline/roster's shimmer pattern),
  `pl-empty.tsx` (wraps `EmptyState`, 2 call sites: no-filter / filtered),
  `pl-error.tsx` (thin wrapper, reuse existing `EduError`-equivalent pattern
  from a sibling feature — grep `components/shared` for an existing generic
  error-state component before writing a new one),
  `pl-table.tsx` + `pl-row-menu.tsx` (desktop, ≥760px),
  `pl-card-list.tsx` (mobile <760px, same data, per NFR-004),
  `pl-create-dialog.tsx` (uses `PLCombobox` ×2 + relationship `Select` +
  `Textarea` note, dialog max-width 470 per design-spec),
  `pl-unlink-dialog.tsx` (thin wrapper around `DestructiveConfirmDialog`,
  supplies interpolated consequence copy + `errorSlot`),
  `pl-detail-dialog.tsx` (read-only label-value rows, 440px, lazy consent
  sub-fetch scoped skeleton/error inside this dialog only),
  `pl-combobox.tsx` (new, see §3 — student variant shows className,
  parent variant shows phone as subLabel, both debounce-search via
  `searchStudentCandidatesAction`/`searchParentCandidatesAction`).
- Badge tone mapping (design-spec `parentLinks.table.relationBadges`/`consentBadges`,
  via `StatusBadge`): relationship `father→info`, `mother→purple`,
  `guardian→muted`; consent `agreed→teal`(`--edu-teal`, closest `StatusBadge`
  tone) — **note**: design-spec literal says `var(--edu-teal)` for agreed,
  `var(--edu-warning-text)` for pending, `var(--edu-error-dark)` for declined;
  map to `StatusBadge` tones `teal`/`warning`/`error-dark` respectively (all
  already AA-compliant per `status-badge.tsx`'s existing tone table — no new
  token needed).
- **Test first**: Storybook interaction stories per state (see Phase 8).
- Done when: all UI states covered, `PLCombobox` keyboard-operable
  (AC-003.8), design-review-gate-ready.

### Phase 5 — App wiring (`(app)/admin/parent-links/`)

- `page.tsx` (RSC) — reads `q`/`classId`/`cursor` search params, calls
  `makeListParentStudentLinksUseCase().execute(...)` server-side, passes VM +
  action refs to `ParentLinksScreen`. Soft-fail to `initialErrorKey` (preserve
  error-vs-empty distinction, do not silently swallow to empty — same
  divergence note as US-E19.2 Phase 6).
- `actions.ts` (`'use server'`) — `listLinksAction` (no role guard needed
  beyond the layout — read path), `createLinkAction`/`unlinkLinkAction`
  (`requireRole(["admin"])` PLUS the `authCtx` tenant-match assembly from
  Phase 3's DI factory — **both checks required, this is the AC-005.5 proof
  surface at the Server Action layer**), `getLinkConsentDetailAction`,
  `searchStudentCandidatesAction`, `searchParentCandidatesAction`. Mirror the
  `Result<T> = {ok:true,data}|{ok:false,errorKey}` shape from
  `admin/grades/approval/actions.ts` verbatim.
- No new route guard — `(app)/admin/layout.tsx` already handles AC-001.6/AC-006.1.
- **Test first**: `actions.test.ts` — directly invoke `unlinkLinkAction`/`createLinkAction`
  with a mocked non-admin `requireRole` result and assert `{ok:false, errorKey:"forbidden"}`
  with **zero** repository calls made (proves the guard short-circuits before
  reaching the mock repo's own tenant check — belt-and-suspenders, both layers
  independently tested per AC-006.2/.3/.4).

### Phase 6 — i18n

- New namespace `parentLinks.*` in `messages/{vi,en}.json`: page header/CTA,
  filter placeholders, table column headers, relation/consent badge labels,
  row-menu items, create-dialog labels/placeholders/toasts/errors,
  detail-dialog labels, unlink-dialog title/body (with `{parent}/{student}/{class}`
  interpolation placeholders)/toasts/error-slot copy, empty/error copy (both
  variants), mobile card-list labels (reuse same keys, no duplication).
  Add both locales in the same commit; verify with `bunx tsc --noEmit`.

### Phase 7 — Storybook + test proof sweep (per TEST_MATRIX / story.md Validation table)

- Confirm every row has a corresponding test/story: unit (all use-cases +
  failure mapping incl. code-vs-message divergence test), integration (mock
  repo incl. the two forged-authCtx tests + duplicate-pair + 404-race),
  Storybook interaction (Loading/Success/EmptyNoFilter/EmptyFiltered/Error/
  CreateDialog[happy+duplicate+validation+network+keyboard-only]/
  DetailDialog[withNote+noNote+consentError]/UnlinkDialog[consequence-copy-assertion+
  confirm+403+404+network+cancel-focus-return]/RoleGateDenied/
  MobileCardList[320/375/768/1280]), `actions.test.ts` for both mutating
  actions' forbidden-shortcut proof, `tsc --noEmit` clean, `bun build` succeeds
  with the route present in output.

## 3. Component + state sketch

```
ParentLinksScreen (client container)
├─ PageHeader (title + "Tạo liên kết" primary button)
├─ FilterBar (search input debounced → URL, class Select)
├─ [Loading] PLSkeleton
├─ [EmptyNoFilter | EmptyFiltered] PLEmpty (wraps EmptyState)
├─ [Error] PLError + retry
├─ [Success, ≥760px] PLTable → PLRow → PLRowMenu (Xem chi tiết / Gỡ liên kết)
├─ [Success, <760px] PLCardList → PLCard (same data, action-menu trigger)
├─ PLCreateDialog
│   ├─ PLCombobox (student variant: className subLabel)
│   ├─ PLCombobox (parent variant: phone subLabel, role="parent"-scoped)
│   ├─ Select (relationship)
│   └─ Textarea (note, optional)
├─ PLUnlinkDialog  → wraps shared DestructiveConfirmDialog (errorSlot reuse)
└─ PLDetailDialog  → label-value rows + lazy consent sub-fetch section
```

**Server / URL / local-form state classification (no Zustand):**
- Server state (TanStack Query): links list (`useInfiniteQuery`), consent
  detail (`useQuery`, `enabled` on dialog open), student/parent search
  candidates (`useQuery`, `enabled` on debounced non-empty text).
- URL state: `q`, `classId`, `cursor` (search-param synced, mirrors
  `audit-log`'s `filter-search-params.ts` pattern — reuse that helper's shape,
  don't reinvent).
- Local-form state: create-dialog field values (student/parent selection,
  relationship, note) — plain `useState`, reset on dialog close/open.
- Local UI state: which dialog is open, which row is targeted (linkId for
  detail/unlink).

**Query-key hierarchy (non-trivial — flag to `fe-state-engineer`):**
```
parentLinksKeys.all              = ["parent-links"]
parentLinksKeys.lists()          = [...all, "list"]
parentLinksKeys.list(filter)     = [...lists(), { q, classId }]   // cursor NOT in key (infinite query)
parentLinksKeys.detail(linkId)   = [...all, "detail", linkId]
parentLinksKeys.consent(studentId, parentId) = [...all, "consent", studentId, parentId]
parentLinksKeys.studentSearch(q, classId?)   = [...all, "student-search", q, classId]
parentLinksKeys.parentSearch(q)              = [...all, "parent-search", q]
```
- Create success → invalidate `lists()` (new row must appear, AC-003.2).
- Unlink success → invalidate `lists()` (row removal via refetch, not
  optimistic `setQueryData` — AC-005.4) AND `detail(linkId)`/`consent(...)` if
  a detail dialog for that link happens to be open concurrently.
- Unlink 404 (AC-005.7) → still invalidate `lists()` (server truth wins;
  "already removed" toast + row disappears via refetch, not a manual removal).
- Search queries: debounce (~300ms) BEFORE the query fires, not inside
  `queryFn` — `enabled: debouncedQ.length > 0`, `staleTime` short (typeahead,
  no need to cache stale candidate sets long).

**Explicit call-outs — both specialists are warranted here, not skippable:**
- **`fe-component-architect`**: (1) design the `PLCombobox` prop contract from
  scratch — no existing primitive in this repo does role=combobox/listbox/option
  + debounced async candidates + keyboard arrow-nav + empty/loading/error
  sub-states; recommend backing it with `bun ui:add command` (shadcn/cmdk) +
  existing `Popover`, and decide up front whether it's parameterized enough
  (student vs parent variant via a `subLabelKey` prop) to live in
  `components/shared/pl-combobox/` NOW (used twice in this single screen
  already satisfies the ≥2-use bar) rather than feature-local-then-promote.
  (2) confirm the `PLUnlinkDialog` wrapper's prop surface over
  `DestructiveConfirmDialog` needs zero new props (should be pure composition —
  verify before implementation starts).
- **`fe-state-engineer`**: (1) the list+filter+cursor `useInfiniteQuery` key
  design above, including the "cursor not in key" rule and RSC-`initialData`
  hydration boundary (mirror `audit-log-screen.tsx`'s exact approach — do not
  reinvent); (2) the invalidation graph for the two mutations, specifically
  the **non-optimistic** constraint on unlink (a plain "no `onMutate`" review
  gate, not a state-machine problem, but must be explicit in the hook design
  so `fe-nextjs-engineer` doesn't default to optimistic-by-habit); (3) the
  debounced-search-as-a-second-order query pattern for both comboboxes
  (2 independent debounce+enabled gates inside one dialog).

## 4. Risks, dependencies, open questions

- **[SECURITY-CRITICAL, non-ADR]** `requireRole` is role-only by design
  (tenant enforced at layout, not Server Action). This story's Unlink/Create
  actions MUST additionally decode `tenantId` via `decodeTenantClaim` and pass
  it as `authCtx` into the repository, which re-validates against the link's
  own tenant. This is the single most important implementation detail in this
  plan — call out explicitly to `fe-tech-lead-reviewer` as the AC-005.5
  verification target, and to `fe-nextjs-engineer` at kickoff so it isn't
  missed as "already handled by requireRole."
- **[OPEN QUESTION, carried, not blocking]** Whether Unlink should emit into
  the existing generic audit-log (`AuditEntityType` extension) — per
  story.md's Harness Delta, this is flagged to `ba-lead` as an ADR candidate.
  Highest existing decision on disk (`docs/decisions/`) is `0059` as of this
  plan — next number is `0060`, confirm with `fe-lead`/`harness-cli decision
  list` before filing (not required for this story's `implemented` gate).
- **[OPEN QUESTION, carried]** Exact duplicate-link error code
  (`LINK_ALREADY_EXISTS`-style, unconfirmed) — AC-003.3 is written against UI
  behavior, holds regardless of exact code; mock uses the assumed code.
- **[OPEN QUESTION, carried]** Consent-cascade-on-unlink (does DELETE clear
  the parent's consent record?) — not this story's concern; mock only deletes
  the link row. Flag for US-E20.2 coordination if their mock needs to react.
- **[GAP, carried]** No confirmed max length for the optional note — treat
  unconstrained client-side (textarea, no `maxLength` prop) until `core`/design
  sets a cap; server may still 422.
- **[GAP, carried]** Long name truncation UX (table + mobile cards) unspecified
  — use `truncate` + native `title` attribute as a safe default; flag to
  `uiux-lead` only if a real long-name case surfaces during build (not a blocker).
- **A11y risk**: `PLCombobox` is the highest a11y-risk surface in this story
  (NFR-002, full keyboard operability of a custom combobox) — needs explicit
  `fe-accessibility-auditor` attention beyond the standard pass; recommend the
  Storybook keyboard-interaction test for this component be written before
  the create-dialog composition test (bottom-up).
- **No design-system token gap identified** — all badge tones map to existing
  `StatusBadge` tones (`info`/`purple`/`muted`/`teal`/`warning`/`error-dark`),
  no ADR needed for this story's visual surface.

## 5. Proof owed (→ TEST_MATRIX rows, per story.md)

- Unit: create/unlink/list-filter use-cases (ok + all failure branches),
  mapper, `toFailure` code-vs-message divergence.
- Integration: mock repository — seeded list, duplicate-pair rejection,
  delete-by-id, **the two forged-authCtx rejection tests (non-admin role;
  cross-tenant admin)** for AC-005.5, member-search candidate pool scoping
  (never returns another tenant/non-parent-role), `actions.test.ts`'s
  zero-repository-call proof for the guard short-circuit.
- E2E: Storybook interaction sweep per Phase 7 + manual keyboard-only pass for
  `PLCombobox` and `PLUnlinkDialog` (focus trap + return).
- Platform: `bunx tsc --noEmit`, `bun run build`, route present in output.
- Release: design-review gate (tokens/a11y/states) **and** a dedicated
  sign-off that the AC-005.5 test exists and passes — release-blocking,
  distinct from the general gate (per story.md's Validation table).
