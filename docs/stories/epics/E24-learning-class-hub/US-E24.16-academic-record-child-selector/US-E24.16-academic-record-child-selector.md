# US-E24.16 Học bạ — phụ huynh chọn con (child selector) trên màn Academic Record

## Status

in-progress

## Lane

normal

> Read-only; thêm 1 read (danh sách con) đã real; điều hướng giữa route có sẵn. Q-G (parent-links không
> regress) không bị chạm.

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/academic-records/presentation/academic-record-screen/**`
  (VM + container + screen slot), `src/app/[locale]/t/[tenant]/(app)/parent/children/[studentId]/
  academic-record/page.tsx` (thêm child list), `components/shared/child-switcher/` (reuse; có thể thêm
  prop `hideWhenSingle`).
- Shared contract/file: `ChildSwitcherVM` (shared, structural), `bootstrap/di/grades.di.ts`
  `makeGetChildListUseCase()` (reuse, không đổi), `messages` namespace `academicRecord` + `Common`.

## Hiện trạng FE (grep 2026-09-06)

- Route parent **hiện có**: `/parent/children/[studentId]/academic-record` (RSC
  `buildAcademicRecordVM({ role: "parent", studentId, year })` → `AcademicRecordContainer` → client
  `AcademicRecordScreen`, year = URL `?year=` qua `router.replace`). **Không có** `/parent/
  academic-record` (design ghi route này ở EPIC; jsx comment line 6 lại ghi
  `/parent/children/:studentId/academic-record`). Entry point: `/parent/children` (index card-per-child,
  US-E20.4) → link `academicRecordHref`.
- `AcademicRecordScreenVM { role, studentId, record, selectedYearId, error }` — không có danh sách con;
  screen multi-role (student/teacher/parent/admin) dùng `roleBadge`, empty copy theo role.
- Child list real: `makeGetChildListUseCase()` (grades.di — parent-links + IAM batch names, trả
  `ChildSummary` khớp `ChildSwitcherChild`) — đã dùng ở `/parent/attendance` và grades. Component
  `components/shared/child-switcher/` (tablist, arrow keys, `Common.childSwitcherLabel`,
  `childOrdinalLabel` fallback, `classPending`) — **canonical**; `discipline/parent-discipline/
  ChildSelector.tsx` là bản feature-local cũ (backlog hợp nhất, không đụng ở US này).
- i18n `academicRecord.*` đầy đủ cho màn; `Common.childSwitcherLabel` có → không cần key mới trừ
  `academicRecord.childSwitcher.hint` (tuỳ).

## Product Contract

Design v3: `design_src/edu/academic-record-view.jsx` (lines ~333–355): với PARENT, hàng nút chọn con
(`aria-pressed`, border 2px màu con, Avatar 34 + tên + "Lớp X", icon check khi chọn) đặt **trên**
`StudentHeader`; màu con index 0 → primary, 1 → success (giống attendance-portal).

- Giữ route hiện có; child selector = **`ChildSwitcher` shared** (tablist, không fork bản aria-pressed —
  decision 0026; ghi deviation "tablist thay aria-pressed, cùng semantics chọn 1"). Chọn con →
  `router.push(/parent/children/{childId}/academic-record)` (**bỏ `?year`** vì năm học khác nhau giữa 2
  con; VM tự chọn năm hiện tại). Active = `studentId` của route.
- Chỉ render khi `childList.length ≥ 2` (khớp rule design-spec discipline `singleChild: hidden`) —
  thêm prop `hideWhenSingle` cho `ChildSwitcher` nếu chưa có (additive, callers cũ không đổi).
- Route với `studentId` không thuộc `childList` → vẫn gọi BE (BE trả 403 → `forbidden` như hiện tại),
  selector không có tab active (không tự chuyển con — không đoán scope).
- Child list lỗi → ẩn selector, màn vẫn render (fail-soft, `Promise.allSettled` trong page).
- **[OPEN QUESTION Q1]** Có thêm route `/parent/academic-record` redirect 308 → con đầu tiên (mục nav
  "Học bạ" cho parent)? Mặc định **không** (parent nav không có mục học bạ; entry qua `/parent/children`);
  nếu uiux/BA yêu cầu → US riêng (đụng `nav-config.ts`).
- Loading khi đổi con: `useTransition` + `aria-busy` trên vùng record; ChildSwitcher `isLoading` chặn
  click con khác trong lúc pending (prop đã có).

## Relevant Product Docs

- `docs/product/design-spec.jsonc` mục academic-record (1506 handoff) — thêm `parent.childSelector`
  (fe sync); `docs/product/screens.md` hàng Academic Record (per child)
- `docs/stories/epics/E20-*/US-E20.4-*`, `US-E20.5-*` (ChildSwitcher promotion, child list real)
- `.claude/rules/component-organization.md` (decision 0026), `accessibility.md`

## Acceptance Criteria

- Parent có ≥2 con: mở học bạ con A → selector hiện 2 tab, tab A `aria-selected`; chọn B → URL đổi sang
  `/parent/children/B/academic-record` (không có `?year`), record của B hiển thị, năm mặc định = năm
  hiện tại của B (page.test).
- Parent 1 con → không render selector (Storybook + test).
- Child list thất bại → không selector, record vẫn render; không toast lỗi thừa.
- studentId lạ → `forbidden` state như hiện tại; selector không active tab (test).
- Keyboard: arrow trái/phải di chuyển focus, Enter/Space chọn (test hiện có của ChildSwitcher không đổi;
  test mới cho `hideWhenSingle`).
- Student/teacher/admin route: VM không có `childSwitcher` → màn không đổi (snapshot/regression stories
  hiện có xanh).
- i18n: không key mới bắt buộc; nếu thêm `academicRecord.childSwitcher.*` → vi + en.
- Gate xanh; design-review + a11y.

## Design Notes

- VM: `AcademicRecordScreenVM.childSwitcher?: ChildSwitcherVM` (optional, parent only); container
  `onSwitchChild(childId)` → `router.push` (tenant base path tính ở page, truyền `basePath`).
- Page: `Promise.allSettled([buildAcademicRecordVM(...), makeGetChildListUseCase().execute()])`.
- UI: slot trên header trong `academic-record-screen.tsx`, chỉ khi `vm.childSwitcher`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `hideWhenSingle`; href builder |
| Integration | page.test parent: 2 con / 1 con / child-list error / foreign studentId |
| E2E | Storybook parent-with-switcher + switching pending |
| Platform | tsc/vitest/build |
| Release | design-review + a11y |

## Harness Delta

Backlog: hợp nhất `discipline/parent-discipline/ChildSelector.tsx` vào `ChildSwitcher` shared
(decision 0026) — ngoài scope US này.

## Plan

### Re-verify vs packet grep note (drift found — code re-checked 2026-09-06/09-02 session)

1. **`ChildSwitcher` (`src/components/shared/child-switcher/`)** — confirmed current shape:
   `ChildSwitcherVM { childList: ChildSwitcherChild[]; activeChildId: string }`, prop
   `onSwitch`, `isLoading?: boolean` (blocks click + `aria-disabled` on inactive tabs while
   pending), tablist/tab roles, arrow-key nav wrapping via `tabRefs`, `childOrdinalLabel`
   fallback when `name` absent. **`hideWhenSingle` does NOT exist as a component prop** —
   correcting the packet's premise. The established "hide when 1 child" behavior lives at the
   **caller** level today: `grade-book-screen.tsx` computes
   `showChildSwitcher = role === "parent" && (childrenList?.length ?? 0) >= 2` and only mounts
   `<ChildSwitcher>` conditionally; `parent-attendance-screen.tsx` in fact does NOT hide for a
   single child (renders whenever `childList.length > 0`) — the two existing callers already
   disagree, so there is no single shared convention to preserve, and no shared-component edit
   is required either way. **Decision: do NOT touch `child-switcher.tsx`.** Follow the
   `grade-book-screen` precedent (role-branching sibling, closer shape to this screen) —
   compute the `>= 2` gate where the VM is built, not in the component. This keeps the change
   100% additive to `academic-records` only; zero risk to `grades`/`parent-attendance`
   regression suites, no new prop, no new component test needed.
2. **`makeGetChildListUseCase()`** (`bootstrap/di/grades.di.ts`) — confirmed reusable as-is.
   Returns `ChildSummary[]` (`grade-book.entity.ts`) which is field-for-field identical to
   `ChildSwitcherChild` (`childId, name?, className, ordinal, avatar, color`) — structural
   assignability, no adapter needed. Already consumed by `/parent/attendance/page.tsx` and
   grades; no change to the use-case or DI factory.
3. **`AcademicRecordScreenVM`** (`academic-record-screen.i-vm.ts`) — confirmed current shape
   `{ role, studentId, record, selectedYearId, error }`, `role` is one of
   `student | teacher | parent | admin`, and `academic-record-screen.tsx` already branches
   purely on `vm.role` (badge tone/copy) with no route-specific logic baked into the
   component — a new **optional** `childSwitcher?: ChildSwitcherVM` field is additive: every
   non-parent VM simply never sets it, `undefined` renders nothing extra, existing
   student/teacher/admin stories and `academic-record-screen.i-vm.test.ts` are untouched.
   **Correction to Design Notes**: the screen's `error` branch and `!record` (empty) branch
   both **return early** today, before `<RecordHeader>` — but AC #4 requires the selector to
   still render (with no active tab) on `studentId lạ → forbidden`. Plan must slot the
   switcher into ALL THREE branches (error / empty / success), not just the success return —
   flagged explicitly in Phase 3 below so it isn't missed at implementation time.
4. **Route composition precedent** — `/parent/attendance/page.tsx` already does the exact
   fail-soft "secondary read may fail, primary must still render" shape this US needs:
   `Promise.allSettled([primaryRead, secondaryRead])`, secondary's rejection/failure is
   swallowed into an empty/undefined value, no toast. Reuse this pattern verbatim for
   `Promise.allSettled([buildAcademicRecordVM(...), makeGetChildListUseCase().execute()])`.
   `academicRecordHref`/`tenantUrl` precedent found in
   `src/features/parent/presentation/children-overview-screen/build-children-overview-vm.ts`
   (`academicRecordHref(basePath, studentId)`) and `src/bootstrap/tenant/tenant-url.ts`
   (`tenantUrl(tenantId, path)`) — **reuse `academicRecordHref` directly** for the switch
   target instead of writing a new href builder (the Validation table's "href builder" unit
   proof is this existing function's *usage*, not a new one — no new pure fn needed unless a
   subtle shape mismatch turns up in Phase 2).
5. **Navigation on switch** — confirmed `ParentAttendanceContainer` precedent: `useTransition`
   → `startTransition(() => router.push/replace(...))`, `isPending` threaded down as
   `isLoading` to `<ChildSwitcher>` AND as `aria-busy` on the content region. `academic-record-
   container.tsx` currently only wires `onYearChange`/`onRetry` (via `router.replace` on
   searchParams, no `useTransition` yet) — Phase 3 adds `useTransition` + `onSwitchChild` →
   `router.push(academicRecordHref(basePath, childId))` (no `?year`, confirmed: switching
   child must NOT carry over the old child's year — VM resolves the new child's current year
   itself, same as `buildAcademicRecordVM`'s existing `isCurrent` fallback).
6. **Foreign `studentId`** — confirmed: no client-side membership check added. Page still
   calls `buildAcademicRecordVM` with the raw `studentId`; BE 403 → `error: "forbidden"` today,
   unchanged. `childSwitcher.activeChildId` simply won't match any tab in `childList` → no tab
   renders `aria-selected="true"` (ChildSwitcher already handles "no match" gracefully, no
   component change).
7. **`hideWhenSingle` render rule** — superseded by point 1: implemented as
   `vm.childSwitcher` being `undefined` when `childList.length < 2` (VM-builder decides,
   not the component).
8. **i18n** — confirmed `academicRecord.*` + `Common.childSwitcherLabel`/`childOrdinalLabel`/
   `classPending` already cover every string the reused `ChildSwitcher` renders. The design
   mockup (`design_src/edu/academic-record-view.jsx` ~L333–355) adds no copy beyond
   name/class/avatar/check, all already covered. **Decision: add zero new i18n keys** (the
   packet's "tuỳ" `childSwitcher.hint` key is not needed — nothing in the design or AC calls
   for extra hint copy under the tablist).
9. **[OPEN QUESTION Q1] default confirmed** — no `/parent/academic-record` redirect route in
   this US; entry stays `/parent/children` → per-child link. Non-blocking, routed around.

### Phase 1 — VM contract extension (additive, domain-adjacent)

- Files:
  - `src/features/academic-records/presentation/academic-record-screen/academic-record-screen.i-vm.ts`
    — add `childSwitcher?: ChildSwitcherVM` (import type from
    `@/components/shared/child-switcher`).
  - `src/features/academic-records/presentation/academic-record-screen/build-academic-record-vm.ts`
    — NO change needed here (this builder stays child-list-agnostic; the switcher is assembled
    at the page/route layer per point 4, since it needs a SECOND, independent read that must
    not couple to `buildAcademicRecordVM`'s own error path). Document this decision inline as a
    comment so a future reader doesn't try to thread childList through this function.
  - New tiny pure helper (co-located in `build-academic-record-vm.ts` or a sibling
    `build-child-switcher-vm.ts` if it grows): `buildChildSwitcherVM(childList: ChildSummary[],
    activeStudentId: string): ChildSwitcherVM | undefined` — returns `undefined` when
    `childList.length < 2`, else `{ childList, activeChildId: activeStudentId }`. This IS the
    "hideWhenSingle" unit proof from the Validation table (renamed to match where the logic
    actually lives — no component prop).
- Test first: `build-child-switcher-vm.test.ts` — cases: `<2` children → `undefined`; `>=2`
  → VM with correct `activeChildId`; `activeChildId` not present in `childList` (foreign
  studentId) → VM still returned (no active tab is a RENDER concern of `ChildSwitcher`, not a
  builder concern) — asserts AC #4's "selector renders, no active tab" at the unit level.
- Done when: `bun vitest run` green for this new test; `academic-record-screen.i-vm.test.ts`
  unaffected (no assertions broken by the new optional field).

### Phase 2 — Page composition (fail-soft secondary read)

- Files: `src/app/[locale]/t/[tenant]/(app)/parent/children/[studentId]/academic-record/page.tsx`.
- Change: mirror `/parent/attendance/page.tsx`'s `Promise.allSettled` shape —
  ```
  const [recordResult, childListResult] = await Promise.allSettled([
    buildAcademicRecordVM({ role: "parent", studentId, year }),
    (await makeGetChildListUseCase()).execute(),
  ]);
  ```
  `recordResult` MUST be awaited/resolved fully (it's the primary read — if it rejects, that's
  a real bug surfaced normally, not swallowed); `childListResult` failure/rejection →
  `childSwitcher: undefined`, no error surfaced, no toast (AC #3). Compute `basePath =
  tenantUrl(tenant, "/parent/children")` (route already has `tenant` from `params` two levels
  up — confirm/thread through, `[tenant]` segment is a parent route param already available via
  the existing `params` destructure pattern other routes use).
- Test first: extend or add `page.test.ts` alongside existing route tests (`/parent/attendance/
  page.test.ts` is the direct template) — cases: (a) 2 linked children → `vm.childSwitcher`
  populated with correct `activeChildId`; (b) 1 linked child → `vm.childSwitcher` is
  `undefined`; (c) child-list read rejects/fails → `vm.childSwitcher` undefined AND
  `vm.record`/`vm.error` from the primary read still populated normally (proves fail-soft);
  (d) foreign `studentId` (not in childList) → `vm.error === "forbidden"` (BE 403, unchanged)
  AND `vm.childSwitcher` still populated (if the parent DOES have ≥2 real children) so the
  selector can render with no active tab.
- Done when: 4 cases above green; existing `student`/`teacher`/`admin` academic-record routes
  untouched (they don't call this page file).

### Phase 3 — Presentation: slot `ChildSwitcher` + navigate-without-year + pending state

- Files:
  - `academic-record-screen.tsx` — render `<ChildSwitcher childList={vm.childSwitcher.childList}
    activeChildId={vm.childSwitcher.activeChildId} onSwitch={onSwitchChild} isLoading=
    {isSwitchingChild} />` guarded by `vm.childSwitcher` (undefined → nothing renders, zero
    diff for non-parent roles). **Must be added to all three return branches** — the `error`
    early-return, the `!record`/empty early-return, AND the main success render — per point 3
    above (AC #4 needs the selector visible even when `error === "forbidden"`). Add `aria-busy`
    on the record content wrapper while `isSwitchingChild`.
  - `academic-record-container.tsx` — add `useTransition`; `onSwitchChild = (childId) =>
    startTransition(() => router.push(academicRecordHref(basePath, childId)))` (no `?year`
    param — confirmed per point 5); pass `isPending` down as the screen's `isSwitchingChild`
    prop. `basePath` must be threaded in as a new prop from the page (RSC has `tenant`, client
    container doesn't) — mirrors how `children-overview-screen` receives `basePath`.
  - `academic-record-screen.i-vm.ts` / screen props — add `onSwitchChild?: (childId: string) =>
    void` and `isSwitchingChild?: boolean` to `AcademicRecordScreenProps` (component props, not
    the VM — matches `onYearChange`/`onRetry`'s existing pattern of being props, not VM fields).
- Test first: `academic-record-screen.stories.tsx` interaction test — "parent switches child"
  story: render with `vm.childSwitcher` (2 children), click the inactive tab, assert `onSwitch`
  fired with the right `childId` (mirrors existing `ChildSwitcher` interaction tests — no new
  assertion style needed). Add a story for the `error`-branch-with-switcher case (AC #4) and
  assert the tablist renders with `aria-selected="false"` on all tabs (no match).
- Done when: Storybook interaction suite green (`vitest.storybook.mts`); existing
  student/teacher/admin stories (13 existing `export const` cases) unchanged and still pass —
  proves the additive-only claim from AC #6.

### Phase 4 — i18n

- No new keys planned (point 8). If Phase 3 implementation surfaces a genuine copy gap not
  covered by `Common.childSwitcherLabel`/`childOrdinalLabel`/`classPending`, add
  `academicRecord.childSwitcher.hint` to BOTH `messages/vi.json` and `messages/en.json` in the
  same commit — do not defer en.

### Phase 5 — Storybook + regression sweep

- States to cover: (a) parent, 2 children, tab A active; (b) parent, 1 child, no selector;
  (c) parent, child-list fetch failed, no selector, record still renders; (d) parent, foreign
  `studentId`, `forbidden` error state WITH selector rendered (no active tab); (e) switching
  pending (`isSwitchingChild=true`) — inactive tabs `aria-disabled`, content region
  `aria-busy="true"`.
- Re-run full existing `academic-record-screen.stories.tsx` (13 cases) + `academic-record-
  screen.i-vm.test.ts` + `build-academic-record-vm.test.ts` to confirm zero regression on
  student/teacher/admin paths (AC #6).
- Design-review gate (`docs/DESIGN_REVIEW.md`) + a11y pass (tablist semantics already
  WCAG-compliant via reused `ChildSwitcher`; only new surface is the `aria-busy` region and the
  error-branch placement).

### Component/state architect hand-off assessment

**No hand-off to `fe-component-architect` or `fe-state-engineer` needed.** Verified against
precedent rather than assumed:
- Component: 100% reuse of the already-promoted, already-shared `ChildSwitcher` (US-E20.5)
  with zero prop/behavior changes — no new component tree to design.
- State: child selection is pure **URL/route state** (`router.push` to a sibling route,
  `useTransition` for pending), identical in shape to the already-shipped
  `ParentAttendanceContainer` pattern (US-E20.5) and `GradeBookContainer`'s `useTransition`
  usage (US-E13.7/E20.5 lineage) — no TanStack Query keys, no new server-state shape, no
  global store. The only genuinely new piece is a ~10-line pure VM-builder function
  (Phase 1), which is squarely `fe-nextjs-engineer` TDD work, not an architecture decision.

### Risks / open items

- **[OPEN QUESTION Q1]** No `/parent/academic-record` redirect route in this US (confirmed
  default, non-blocking — see point 9).
- Packet's `hideWhenSingle` premise was a component-prop assumption that doesn't match current
  code; resolved as a VM-builder-level gate instead (point 1) — flagging so `fe-lead`/reviewer
  don't expect a `child-switcher.tsx` diff in this US's changeset.
- `basePath` threading (RSC `tenant` → client container prop) is a small new wire but has a
  direct precedent (`children-overview-screen`) — low risk.
- No new BE contract, no new token, no ADR needed for this story.

## Evidence

Branch `feat/us-e24.16-academic-record-child-selector`, 9 commits (6 implementation + 3 review-fix
round), TDD red→green at every step.

### Proof commands (final tree, after merge-ready fix round)

| Command | Result |
| --- | --- |
| `bunx tsc --noEmit` | clean |
| `bun vitest run` | 595 files / **5026 passed**, 0 failed (one earlier run showed 10 files/21 tests
  failing under machine contention with other concurrent worktrees — confirmed pure flake, clean
  rerun immediately after) |
| `bun vitest run --config vitest.storybook.mts` | 173 files / **1428 passed**, 0 failed |
| `bunx biome check` | 0 errors; 1 warning + 1 info, both pre-existing in
  `features/messaging/presentation/message-context-menu/message-context-menu.tsx`, untouched |
| `bun run build` | ✓ compiled; `/parent/children/[studentId]/academic-record` unaffected route
  shape confirmed in the route table |

### Implementation summary

- `build-child-switcher-vm.ts` — new pure builder: `childList.length < 2` → no switcher VM (this
  IS the "hide when single" rule, resolved at the VM-builder level per the `grade-book-screen`
  precedent — **`components/shared/child-switcher/child-switcher.tsx` has ZERO edits**, decision
  `0026` honoured exactly). Foreign/unowned `studentId` → VM still built with no matching active
  tab (no auto-select, no guess).
- `page.tsx` (parent academic-record route) — `Promise.allSettled([buildAcademicRecordVM(...),
  makeGetChildListUseCase().execute()])`, mirroring `/parent/attendance/page.tsx`'s fail-soft
  pattern; child-list failure (reject OR `ok:false`) → `childSwitcher: undefined`, record still
  renders, no toast.
- `academic-record-screen.tsx` — switcher slotted into the header across all 3 states (success/
  error/empty); `ChildTabPanel` (module-level, not declared in-render) pairs `role="tabpanel"` +
  `id`/`aria-labelledby` only when a child tab is genuinely active — omitted entirely on a foreign
  `studentId` to avoid a dangling ARIA reference. `useTransition`/`isSwitchingChild` drives
  `ChildSwitcher`'s `isLoading` (blocks re-click) + `aria-busy` on the panel region.
- `onSwitchChild` → `router.push(academicRecordHref(basePath, childId))`, no `?year` carried over
  (each child's VM resolves its own current year server-side).
- No i18n keys added — `Common.childSwitcherLabel`/`childOrdinalLabel`/`classPending` (already used
  by `parent-attendance`/`grade-book`) cover this screen's usage verbatim.

### Review round (fe-tech-lead-reviewer + fe-accessibility-auditor, parallel)

- **fe-tech-lead-reviewer verdict: Revision Required → all closed.** Architecture/reuse/fail-soft/
  security all PASS on first pass (decision `0026` compliance independently verified via
  `git diff --stat -- src/components/` = empty). MUST FIX: (1) zero Storybook coverage for the
  entire new render surface — closed with 6 new stories (`ParentTwoChildrenSwitch`,
  `ParentSingleChildNoSelector`, `ParentChildListFetchFailed`, `ParentForeignStudentIdNoActiveTab`,
  `ParentErrorWithActiveChildPanel`, `ParentSwitchingChildBusy`); (2) a dead lint suppression in
  `page.test.ts` — removed, `bunx biome check` now 0 new warnings. SHOULD FIX: error branch didn't
  pair the tabpanel on a valid active child (dangling `aria-controls` in the one branch commit
  `980d645e` missed) — fixed, proven by a temporarily-forced-red test; `RecordBody` was declared
  inside the render function (remount-on-every-render anti-pattern) — hoisted to module-level
  `ChildTabPanel`; a cross-feature presentation import (`academicRecordHref` reached into
  `features/parent/presentation/`) — relocated to `bootstrap/tenant/` next to `tenantUrl`, both call
  sites updated.
- **fe-accessibility-auditor verdict: Conditional Pass → closed.** A11Y-001 (Major): the
  tabpanel/`aria-busy`/no-active-tab ARIA logic was correct in code but had zero executable proof —
  same root cause as the reviewer's MUST FIX #1, closed by the same 6 stories (each asserts the
  exact ARIA attribute, not just "renders without crashing"). A11Y-002 (Minor, deferred): `tab-${id}`/
  `tabpanel-${id}` ID templates in `child-switcher.tsx` and `year-timeline.tsx` are byte-identical
  and unnamespaced across the two nested tablists — collision is improbable today (childId vs
  yearId have different shapes) but latent. Deliberately NOT fixed in this US (touches the shared
  `child-switcher.tsx`, wider blast radius than this story's scope) — tracked below as backlog.

### Design-review gate (fe-lead, `docs/DESIGN_REVIEW.md`)

- **Design-system conformance**: pass. Raw-color/anti-pattern grep across every touched file — zero
  hits. The only `transition` in the touched files is `year-timeline.tsx`'s pre-existing
  `transition-colors` (not new to this story, not the kind gated by `prefers-reduced-motion` per
  repo convention). Component reuse confirmed: `ChildSwitcher` genuinely untouched (verified by
  diff, not just claimed).
- **Accessibility**: pass — both the Major and the dangling-ARIA-in-error-branch findings closed
  with real story-level assertions (`aria-selected`, `aria-controls`, tabpanel `id`/
  `aria-labelledby` presence AND absence, `aria-busy`, `aria-disabled`). A11Y-002 deliberately
  deferred (see above) — flagged to Harness Delta, not blocking.
- **`/impeccable audit`**: same pre-existing `NO_PRODUCT_MD` gap as US-E24.6/E24.14 (tracked since
  E07.1, out of scope here). Manual scoped audit against the "Absolute bans" checklist — 0 findings.
- **States & responsive**: pass — success/error/empty/loading + all 5 new child-switcher states
  (2-children-switch, 1-child-hidden, list-fetch-failed, foreign-studentId, switching-pending)
  covered by Storybook; non-parent roles (student/teacher/admin) confirmed unaffected (existing 13
  stories green, unchanged).

```
Design review: pass
- design-system: conform (token/typography/component OK, ChildSwitcher untouched)
- a11y: WCAG AA OK (1 major closed, 1 minor deferred to backlog); keyboard OK; reduced-motion OK
- impeccable audit: manual scoped audit (init prerequisite unmet, pre-existing gap), 0 findings
- states: success/error/empty/loading + 5 child-switcher states OK; non-parent-role regression-safe
```

### Backlog (not blocking this US)

- A11Y-002: namespace `tab-${id}`/`tabpanel-${id}` in `components/shared/child-switcher/
  child-switcher.tsx` (e.g. `tab-child-${id}`) to remove latent collision risk with
  `year-timeline.tsx`'s identical template — one-file change, no consumer impact, deferred because
  it touches a shared component outside this story's scope.
- Pre-existing (not introduced by this US): the INACTIVE tab's `aria-controls` in `ChildSwitcher`
  points at a tabpanel id that also doesn't exist until that tab becomes active — same pattern
  exists in `grade-book-screen`/`parent-attendance-screen` today. Cross-cutting, not a regression
  from this story; candidate for a future shared-component hardening pass.
