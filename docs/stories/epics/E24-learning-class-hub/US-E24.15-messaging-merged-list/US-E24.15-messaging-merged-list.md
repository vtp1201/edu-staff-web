# US-E24.15 Messaging: gộp Direct + Group thành một danh sách, nút "Tạo nhóm" icon ở header list

## Status

in-progress

## Lane

normal

> UI-only trong `features/messaging/presentation`; không đổi domain/repo/BE. Chọn normal (không tiny)
> vì đổi cấu trúc ARIA (bỏ tablist) + prune i18n + Storybook regression.

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/messaging/presentation/conversation-list/**` (+ stories),
  `conversation-item/conversation-item.tsx` (marker nhóm), `messaging-screen/messaging-screen.tsx`
  (prop `onCreateGroup` đã có — chỉ đổi vị trí nút), `messaging-screen/empty-messaging-state.tsx` (nếu
  copy nhắc "tab Nhóm").
- Shared contract/file: `messages/{vi,en}.json` namespace `messaging` (prune `messaging.tabs.*`,
  `messaging.search.noGroups`; giữ `messaging.group.*` cho modal/empty), `design-spec.jsonc#screens.messaging`.

## Hiện trạng FE (grep 2026-09-06)

- `conversation-list.tsx`: header = title "Tin nhắn" + pill `totalUnread` + **1 nút icon `Plus`**
  (`onNewMessage`, `aria-label messaging.newMessage.button`); search; **tablist `direct | groups`**
  (`role=tab`, `aria-selected`, `aria-controls` panel); tab Groups có strip CTA "Tạo nhóm mới"
  (`group.emptyCreateCta`, chỉ khi `onCreateGroup`) + empty state riêng (`group.emptyTitle/
  emptySubtitle`) ; tab Direct empty `search.noResults`.
- `messaging-screen.tsx` truyền `onCreateGroup` theo gate `canCreateGroup` (`group-creation-gate.ts`,
  US-E10.4 — role-gated) → `CreateGroupModal` (đã có, 2-step). `ConversationEntity.type =
  'direct'|'group'`; `conversation-item.tsx` render cả 2 loại (avatar/tone qua `avatar-tone.ts`).
- `conversation-list.stories.tsx` có stories theo tab → phải viết lại.
- i18n có: `messaging.tabs.{direct,groups}`, `messaging.group.{createButton,createTitle,emptyCreateCta,
  emptyTitle,emptySubtitle,...}`, `messaging.newMessage.button`, `messaging.search.{placeholder,
  noResults,noGroups}`.

## Product Contract

Design v3: `design_src/edu/messaging.jsx` → left pane (lines ~1549–1592): header có **2 icon button**
(32×32 radius 9): `users` "Tạo nhóm mới" (nền `T.bg` + border) và `plus` "Tin nhắn mới" (nền
primary/15 + border primary/30); search; **một list**: direct rồi group (không tab); empty "Không tìm
thấy". design-spec `screens.messaging` (2584+) cần cập nhật phần list (fe sync).

- Bỏ tablist + panel; list = `<ul>` một danh sách. Thứ tự: **[OPEN QUESTION Q1]** design xếp direct
  trước, group sau; hộp thư thực tế nên theo `lastMessageAt` desc. Mặc định: **sort theo thời gian tin
  cuối desc** (unread lên không bắt buộc), fallback design order khi thiếu timestamp; ghi deviation.
- Header: thêm nút icon `Users` (lucide) "Tạo nhóm mới" — `aria-label` `messaging.group.createTitle`
  (reuse), tone `bg-muted border-border text-muted-foreground`; chỉ render khi `onCreateGroup`
  (`canCreateGroup`). Nút "Tin nhắn mới" giữ (primary tint). Cả 2 ≥44px touch trên mobile (size-9 →
  kèm padding/hit-area, hoặc size-11 ở `<640`).
- Search lọc trên cả 2 loại. Empty (có search) → `search.noResults`; empty tuyệt đối (0 hội thoại) →
  giữ `EmptyMessagingState` hiện có ở pane phải + list hiển thị 1 dòng gợi ý (reuse `group.emptySubtitle`
  nếu `canCreateGroup`).
- Row nhóm phải phân biệt được không chỉ bằng hình avatar: `conversation-item` thêm sr-only "Nhóm" +
  icon `Users` nhỏ cạnh tên (đã có? — kiểm tra; nếu có badge member count thì đủ) — a11y decision 0013
  (không chỉ màu/hình).
- Prune i18n: xoá `messaging.tabs.*`, `messaging.search.noGroups`, `messaging.group.emptyTitle`
  (nếu không còn dùng) ở vi + en; `tsc` bắt dead/missing.
- Deep-link `?conversation=` giữ; mobile pane logic (`pane-visibility.ts`) không đổi.

## Relevant Product Docs

- `docs/product/design-spec.jsonc#screens.messaging` (list section), `docs/product/screens.md` hàng Messaging
- `docs/stories/epics/E10-*/US-E10.4-*` (group creation gate), DR-008 (group chat)
- `.claude/rules/component-organization.md`, `accessibility.md`

## Acceptance Criteria

- List render cả direct + group không tab; `role=tablist` không còn trong DOM; `ul>li` với
  `ConversationItem` như cũ; sort theo tin cuối desc (unit test comparator, deterministic).
- Search "10A1" trả cả nhóm "Nhóm lớp 10A1" và contact tên khớp.
- `canCreateGroup=true` → header có 2 icon button (aria-label đúng, Tab order: Tạo nhóm → Tin nhắn mới
  → search); `false` → chỉ "Tin nhắn mới"; click "Tạo nhóm" mở `CreateGroupModal` (test hiện có của
  messaging-screen xanh, chỉ đổi selector nút).
- Row nhóm có accessible name chứa "Nhóm" (sr-only) hoặc marker text; screen reader không phụ thuộc hình.
- `totalUnread` pill giữ; unread per-row giữ.
- Storybook `conversation-list.stories.tsx`: default (mixed) / only-direct / only-groups / search-empty /
  loading / error / no-create-permission / viewport 375.
- i18n: key chết đã xoá ở vi + en, `bunx tsc --noEmit` sạch; không thêm key trùng nghĩa với
  `group.createTitle`.
- Gate xanh; design-review + a11y.

## Design Notes

- UI: `conversation-list.tsx` (bỏ state `tab`), `conversation-list.sort.ts` (pure comparator),
  `conversation-item.tsx` (group marker).
- State: không đổi query (`["messaging","conversations"]`).
- Không đổi `ConversationListProps` ngoài việc `onCreateGroup` giờ dùng ở header.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | sort comparator; filter search cross-type |
| Integration | messaging-screen test: create-group nút ở header |
| E2E | Storybook states + keyboard order |
| Platform | tsc/vitest/build (i18n prune) |
| Release | design-review + a11y |

## Plan

### Grep-verified facts (before phasing)

- `conversation-list.tsx` today: local `tab` state (`"direct"|"groups"`), a `role=tablist` strip
  (2 `role=tab` buttons, `aria-selected`, both `aria-controls` one shared `panelId`), a single
  `role=tabpanel` wrapping the filtered `<ul>`. Groups-tab-only CTA strip (`group.emptyCreateCta`,
  gated on `onCreateGroup`) sits above the list; Groups-tab absolute-empty state (icon + `group.
  emptyTitle`/`emptySubtitle` + a second `emptyCreateCta` button) only renders when `filtered.length
  === 0 && tab === "groups" && !search.trim()`; Direct-tab-empty and any-tab-with-query-empty render
  `search.noResults` (Direct) / `search.noGroups` (Groups).
- **`ConversationEntity` has NO raw sortable timestamp today** (`src/features/messaging/domain/
  entities/conversation.entity.ts`) — only `lastMessageTime: string`, a display-formatted label
  ("10:15" / "Hôm qua" / "2 ngày", from `formatWireTimestamp(...).time` or the mock literal).
  Neither `ConversationResponseDto` (mock/legacy wire) nor `MOCK_CONVERSATIONS` fixtures carry a raw
  ISO value. The REAL wire (`RoomSummaryResponseDto.lastMessageAt`) DOES carry raw ISO, but
  `toConversationEntityFromRoom` currently drops it (only keeps the formatted `.time`). **This means
  the AC "sort theo `lastMessageAt` desc, deterministic" cannot be satisfied at the presentation
  layer alone** — see Risk R1 below; Phase 0 is a small, additive domain+infra prerequisite.
- `conversation-item.tsx` today: **no existing group differentiator at all** beyond avatar shape
  (`rounded-xl` group vs `rounded-full` direct, `avatar-tone.ts` colour) — no icon, no member-count
  chip, no sr-only text, despite `docs/product/design-spec.jsonc#screens.messaging.groupChat.
  groupList.memberCountChip` documenting one (stale doc vs runtime, decision `.claude/CLAUDE.md`
  "conflict giữa doc và code → tokens/runtime thắng" analog applies: code is truth, doc is stale).
  **The packet's "nếu có badge member count thì đủ" premise is false — the marker must be added.**
- i18n grep (own, not packet's prose) — usage OUTSIDE `messages/{vi,en}.json` themselves:
  - `messaging.tabs.direct` / `messaging.tabs.groups` — **only** consumer is
    `conversation-list.tsx:119` (`t(\`tabs.${id}\`)` inside the tablist map). Fully dead once the
    tablist is removed.
  - `messaging.search.noGroups` — **only** consumer is `conversation-list.tsx:199`. Dead.
  - `messaging.group.emptyTitle` — **only** consumer is `conversation-list.tsx:181` (old Groups-tab
    absolute-empty heading). Dead once that block is replaced (Phase 4 keeps only the subtitle line
    per Product Contract's explicit reuse instruction).
  - `messaging.group.emptyCreateCta` — 2 consumers, both in the same old block (CTA strip line 158 +
    empty-state button line 192), both removed in Phase 4 (header's "Tạo nhóm mới" icon button is now
    the only group-creation affordance in the list pane; Product Contract's absolute-empty spec only
    asks for a reused subtitle line, not a second CTA button). Dead.
  - `messaging.group.emptySubtitle` — **KEEP**, explicitly reused per Product Contract ("list hiển
    thị 1 dòng gợi ý (reuse `group.emptySubtitle` nếu `canCreateGroup`)").
  - `messaging.group.createTitle` / `createButton` — used in `create-group-modal.tsx` (86, 160), plus
    now doubling as the new header button's `aria-label`. **KEEP, no new key** (satisfies AC's "không
    thêm key trùng nghĩa với `group.createTitle`").
  - **Final removal list (vi + en, same paths)**: `messaging.tabs.direct`, `messaging.tabs.groups`
    (i.e. drop the whole `tabs` object — grep found zero other users of `messaging.tabs.*`),
    `messaging.search.noGroups`, `messaging.group.emptyTitle`.
- `conversation-list.stories.tsx` today has **no story that exercises the removed tab/CTA/empty-group
  paths** (Loading/DirectTabPopulated/ErrorState/Presence*) — low regression risk there. BUT
  `messaging-screen.stories.tsx` has **2 stories that click `getByRole("tab", { name: "Nhóm" })`**
  before reaching the "+ Tạo nhóm" CTA (lines ~911, ~1524) — these break once the tablist is gone and
  must be rewritten to click the new header "Tạo nhóm mới" icon button directly.
- `messaging-screen.tsx#handleBack` focuses `listPaneRef.current?.querySelector('[role="tab"],
  button')` on returning to the mobile list pane — with the tablist gone this selector still
  resolves (falls through to the first `button`, which is now the header's first icon button), so
  **no functional break**, but the dead `[role="tab"]` half of the selector should be dropped as
  mechanical cleanup in Phase 4 (same file already touched for nothing else — 1-line diff only,
  no behavior change).
- No repository/use-case does any sorting today (`get-conversations.use-case.ts` passthrough,
  `hybrid-messaging.repository.ts` passthrough) — sort has always been a presentation concern, so
  adding `conversation-list.sort.ts` doesn't shift an existing responsibility.
- `group-creation-gate.ts` (`canCreateGroupFor`) and `pane-visibility.ts` are unaffected — no changes
  planned there.

### Risk R1 — domain/infra touch despite "UI-only" lane framing (flag to fe-lead)

The Dependencies section scopes this story to `presentation/**` only, but the AC's "sort by real
last-message time, deterministic" is unsatisfiable without a raw sortable value reaching the entity.
Recommended minimal, additive fix (Phase 0), kept as small as possible:

1. `ConversationEntity` — add `lastMessageAt?: string` (raw ISO, optional — additive, no consumer
   breaks).
2. `toConversationEntityFromRoom` (real path, `messaging.mapper.ts`) — pass through
   `dto.lastMessageAt` (the mapper already destructures/reads that DTO; one field addition to the
   returned object, DTO already declares it — **zero DTO change** on this path).
3. `ConversationResponseDto` (mock/legacy wire type) — add optional `lastMessageAt?: string`;
   `toConversationEntity` passes it through; `MOCK_CONVERSATIONS` fixtures seed literal ISO strings
   (mock/seed data, not i18n — `.claude/rules/i18n.md` exclusion applies) so Storybook/mock mode
   actually demonstrates the sort instead of only ever hitting the "missing timestamp" fallback.
4. `conversation-list.sort.ts` sorts on `lastMessageAt`; nothing else in `infrastructure/` or
   `bootstrap/` changes — no endpoint, no DI, no BE contract change.

This is a scope escalation beyond the packet's stated "presentation only" — **flag to fe-lead
before Phase 0 lands**; if fe-lead prefers to stay strictly presentation-only, the fallback is to
descope the sort AC to "stable design order only" (direct-then-group, matching today's array order)
and open a follow-up story once a real timestamp is threaded through. This plan proceeds with the
small addition above as the default, since it is additive/non-breaking and is the only way to
honestly close the AC as written.

### Phase 0 — Domain + infra: raw sortable timestamp (prerequisite, flagged R1)

- Files: `domain/entities/conversation.entity.ts` (+`lastMessageAt?: string`),
  `infrastructure/dtos/conversation-response.dto.ts` (+`lastMessageAt?: string`),
  `infrastructure/mappers/messaging.mapper.ts` (`toConversationEntity` + `toConversationEntityFromRoom`
  passthrough), `infrastructure/repositories/mocks/fixtures.ts` (seed ISO strings on
  `MOCK_CONVERSATIONS`, values consistent with the existing display strings, e.g. today's date for
  "10:15", yesterday's for "Hôm qua", -2d for "2 ngày").
- Test first: extend `messaging.mapper.test.ts` — `toConversationEntityFromRoom` and
  `toConversationEntity` both carry `lastMessageAt` through unchanged; absent-on-wire → `undefined`
  (not a thrown error).
- Done when: mapper tests green; `ConversationEntity` type has the new optional field with zero
  other call-site breakage (`tsc --noEmit` clean).

### Phase 1 — i18n prune (mechanical, cheapest, isolated)

- Files: `bootstrap/i18n/messages/vi.json`, `bootstrap/i18n/messages/en.json` — remove
  `messaging.tabs` (whole object), `messaging.search.noGroups`, `messaging.group.emptyTitle`. Keep
  `messaging.group.emptySubtitle`, `createTitle`, `createButton`, `emptyCreateCta` (the last one is
  actually now unused too per the grep above — **remove it as well**, revise: final removal list =
  `tabs.direct`, `tabs.groups`, `search.noGroups`, `group.emptyTitle`, `group.emptyCreateCta`; keep
  only `group.emptySubtitle` from the old empty-state family).
- Test first: none new (pure deletion) — proof is `bunx tsc --noEmit` (typed messages catch any
  surviving reference immediately, per `messages.d.ts` augmentation) run AFTER Phase 4 removes the
  last usages (sequence matters: don't delete keys before their usages are gone, or build breaks
  mid-phase — do Phase 1's JSON edit together with/after Phase 4's JSX edit, not before).
- Done when: zero grep hits for the 5 removed key paths outside `messages/*.json`; `tsc --noEmit`
  clean.

### Phase 2 — Sort comparator (pure, unit-testable in isolation)

- Files: `presentation/conversation-list/conversation-list.sort.ts` (new).
- Behavior: `compareByLastMessageDesc(a: ConversationEntity, b: ConversationEntity): number` —
  both have `lastMessageAt` → `Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt)` (desc);
  exactly one has it → the one WITH a timestamp sorts first (a known-recent message outranks an
  unknown one); neither has it → `0` (stable — `Array.prototype.sort` is spec-guaranteed stable
  since ES2019/V8, so items lacking a timestamp keep their original relative order, which today's
  fixture/DTO order already is "direct block then group block" — this literally IS the "fallback
  design order khi thiếu timestamp" the packet asks for, with zero extra code).
- Export `sortConversations(list: ConversationEntity[]): ConversationEntity[]` (non-mutating —
  `[...list].sort(compareByLastMessageDesc)`) as the one thing `conversation-list.tsx` imports.
- Test first: `conversation-list.sort.test.ts` — (a) two items both with `lastMessageAt`, later one
  first; (b) mixed (one with, one without) → the one with wins; (c) both missing → input order
  preserved (assert on a 3+ item array to catch an unstable/non-deterministic implementation);
  (d) equal timestamps → input order preserved (stability, not "0 = undefined behavior").
- Done when: 4 comparator cases green, deterministic (no `Date.now()` inside the comparator).

### Phase 3 — `conversation-item.tsx` group marker (mechanical, regression-guarded)

- Files: `presentation/conversation-item/conversation-item.tsx`.
- Add: a small `Users` icon (`lucide-react`, `aria-hidden="true"`, `size-3` or so) rendered inline
  next to `name` ONLY when `isGroup`, plus a genuinely new sr-only span `"Nhóm"` — but per
  `conversation-item.tsx`'s existing a11y pattern (`aria-label` on the row button replaces "name from
  content", see `conversationPresenceSuffix` comment), a nested sr-only span would be silently
  swallowed the same way the presence span would be. **Fold the marker into the button's own
  `aria-label`** instead, mirroring the existing `conversationPresenceSuffix` pattern: a new small
  pure helper `conversationGroupSuffix(isGroup: boolean, groupLabel: string): string` returning
  `", <label>"` or `""`, composed into the same aria-label template
  (`${t("openConversation",{name})}${groupSuffix}${presenceAnnouncement}`). The `Users` icon stays
  purely decorative (`aria-hidden`) since the accessible name already carries "Nhóm" via the label.
- i18n: reuse an existing key for the label text if one fits (check `messaging.group.*`) — if none
  fits cleanly, this is the ONE new key this story may add, e.g. `messaging.group.srLabel` = "Nhóm"
  in vi.json + en.json (does not duplicate `group.createTitle`, satisfies the "no new key with the
  same meaning as `createTitle`" AC — different meaning, different key).
- Test first: extend `conversation-item.test.tsx` if one exists (check first — none was found in the
  earlier ls; if absent, add a minimal new one) OR cover via the Storybook interaction added in
  Phase 6 (`PresenceGroupNoDot`-style story asserting `getByRole("button", { name: /Nhóm/ })` or
  equivalent). Prefer a Storybook interaction test since `conversation-item` currently has stories
  colocated with `conversation-list` and no standalone unit test file — don't invent one where the
  existing test-layer convention (per `docs/TEST_MATRIX.md`) is Storybook interaction for this
  component.
- Done when: a group row's accessible name contains "Nhóm"; a direct row's does not; existing
  presence-suffix behavior (Phase-untouched) still passes.

### Phase 4 — `conversation-list.tsx` restructure (the core of the story)

- Files: `presentation/conversation-list/conversation-list.tsx`,
  `presentation/messaging-screen/messaging-screen.tsx` (1-line `handleBack` selector cleanup only).
- Remove: `Tab` type, `tab` state, the `role=tablist`/`role=tab`/`role=tabpanel` block entirely,
  `panelId`, the Groups-tab CTA strip, the Groups-tab absolute-empty block, the `tab === "groups"`
  branch of the empty/no-results ternary.
- New structure:
  - Header: two icon buttons in a `flex items-center gap-2` row — (1) `Users` "Tạo nhóm mới"
    (`aria-label={t("group.createTitle")}` — reuse, no new key; tone `bg-muted border-border
    text-muted-foreground`; render ONLY when `onCreateGroup` is truthy, i.e. `canCreateGroup`), then
    (2) the existing `Plus` "Tin nhắn mới" button (`onNewMessage`, unchanged props/tone). This order
    (create-group → new-message → search) matches the packet's required Tab order AND the design's
    `users` icon first, `plus` second (design_src/edu/messaging.jsx ~1549–1592). Both `size-9` with
    `max-[820px]:min-h-11 max-[820px]:min-w-11` (repo's existing mobile-hit-area idiom — grep other
    `min-[…]`/`max-[…]` touch-target usages before assuming `<640`; confirm the idiom at
    implementation time and reuse it verbatim rather than inventing a new breakpoint).
  - Filter: `useMemo` computing `filtered = sortConversations(conversations.filter(c => !q ||
    c.name.toLowerCase().includes(q)))` — the `wantGroup`/`tab` predicate is deleted outright (search
    already worked across both types, since the old filter only added the tab predicate on top; no
    new cross-type logic needed, confirmed by reading the old `.filter` body above).
  - Body: no more `tabpanel` wrapper — the loading-skeleton / error-alert / list `<ul>` sit directly
    under the search header, same conditional order as today (`loadError ? ... : isLoading ? ... :
    <>...</>`).
  - Empty states: (a) has a search query and zero matches → `search.noResults` (unchanged copy/case,
    now applies uniformly instead of only to the Direct tab); (b) **zero conversations at all**
    (`conversations.length === 0`, not just `filtered.length === 0`) — list pane shows a single
    centered hint line reusing `group.emptySubtitle` ONLY when `canCreateGroup`/`onCreateGroup` is
    set, else render nothing extra in the list pane (the right pane's `EmptyMessagingState` in
    `messaging-screen.tsx` already carries the primary empty messaging; this is a secondary,
    optional list-side nudge, not a duplicate empty-state UI). No new icon block, no new button —
    matches Product Contract's literal "1 dòng gợi ý" wording; the more elaborate old Groups-tab
    empty block (icon + title + CTA button) is intentionally NOT re-created (that's what makes
    `emptyTitle`/`emptyCreateCta` genuinely dead, not just relocated).
- Test first (unit-adjacent, pure logic extracted where practical): none new beyond Phase 2's
  comparator tests — this phase's proof is the Storybook interaction suite (Phase 6) plus the a11y
  assertion `role=tablist` absent from DOM (AC's explicit DOM-shape assertion).
- Done when: `role="tablist"`/`role="tab"`/`role="tabpanel"` all absent from rendered output; single
  `<ul>` renders both types sorted; header shows 1 or 2 buttons per `canCreateGroup`; keyboard Tab
  order is create-group → new-message → search (DOM order = tab order here, no explicit `tabIndex`
  needed).

### Phase 5 — `docs/product/design-spec.jsonc#screens.messaging` sync

- Update the top-level `"features"` array: replace `"Direct / Groups tabs"` with something like
  `"single merged list (direct + group), sorted by last-message time desc"`.
- Under `groupChat.groupList`: annotate/remove the now-stale `createCTA` sub-object (the "+ Tạo nhóm"
  sub-header strip no longer exists — it moved to the pane header as an icon button) — either delete
  it or add a `"supersededBy"` note pointing at the new header button, per team convention of not
  silently deleting documented history without a pointer (check how other superseded design-spec
  entries in this file are annotated, e.g. search for `"supersededBy"` or similar markers before
  picking a convention — reuse an existing one if found, else a plain comment is fine since `.jsonc`
  allows `//`).
- Add a short note under `groupList` (or a sibling key) documenting the new `memberCountChip`-adjacent
  reality: the sr-only "Nhóm" + decorative icon marker (Phase 3), since the doc's existing
  `memberCountChip` entry was already stale/never implemented — either implement the full chip to
  match the doc (out of this story's minimal scope) or correct the doc to describe what actually
  ships (sr-only label + small icon, no visible member-count number). **Recommend correcting the doc**
  to avoid re-creating the same doc/runtime drift this story just found.
- No token additions — no ADR needed (all classes reused: `bg-muted`, `border-border`,
  `text-muted-foreground`, existing primary tint on the kept button).

### Phase 6 — Storybook rewrite (regression + net-new states)

- `conversation-list.stories.tsx`: existing `Loading`/`ErrorState`/`Presence*` stories are
  structurally unaffected (no tab dependency found) — keep as-is, just verify they still pass once
  Phase 4 lands (no `role=tab` assertions in them to break). Rewrite/add the 8 states the packet's
  AC lists explicitly:
  1. **default (mixed)** — direct + group conversations, sorted by `lastMessageAt` desc (assert
     order via row text/position, not just presence).
  2. **only-direct** — verify list renders, no group marker appears anywhere.
  3. **only-groups** — verify every row carries the "Nhóm" accessible-name marker.
  4. **search-empty** — query with zero matches → `search.noResults` text visible.
  5. **loading** — adapt existing `Loading` story (already covers this — reuse, don't duplicate).
  6. **error** — adapt existing `ErrorState` story (already covers this — reuse, don't duplicate).
  7. **no-create-permission** — `onCreateGroup: undefined` → only 1 header button ("Tin nhắn mới"),
     assert the "Tạo nhóm mới" button is absent (`queryByRole` returns null).
  8. **viewport 375** — Storybook viewport parameter set to a 375px frame; assert both header
     buttons still render at ≥44px hit area (touch-target check) and no horizontal overflow.
  So: 2 states reused from the current file, 6 states net-new (mixed-sort, only-direct, only-groups,
  search-empty, no-create-permission, viewport-375 — "only-direct"/"only-groups" replace the old
  tab-populated implicit coverage; the group-marker assertion folds into "only-groups" rather than
  needing its own 9th story).
- `messaging-screen.stories.tsx`: fix the 2 stories that currently do
  `userEvent.click(canvas.getByRole("tab", { name: "Nhóm" }))` before finding the "+ Tạo nhóm" CTA —
  replace with a direct click on the header's "Tạo nhóm mới" icon button
  (`canvas.getByRole("button", { name: m.messaging.group.createTitle })` or equivalent), since the
  CTA is no longer tab-gated. Re-verify no other story in that file depends on tab presence (grep
  found only these 2 hits for `role="tab"`/"Nhóm" tab-click — re-confirm at implementation time since
  new stories may have been added between planning and building).

### Phase 7 — Platform + regression close-out

- `bunx tsc --noEmit` — catches any surviving reference to a removed i18n key (typed messages) and
  any type mismatch from the new optional `lastMessageAt` field.
- `bun vitest run` — Phase 0 mapper tests, Phase 2 comparator tests, Phase 3's interaction/unit
  coverage, all green.
- `bun vitest run` (storybook interaction project) + `bun build` per pre-push gate — no
  `--no-verify`.
- Design-review gate (`docs/DESIGN_REVIEW.md`) + a11y pass (`fe-accessibility-auditor`): confirm
  `role=tablist` truly gone from the DOM (grep the rendered story snapshot or assert in an
  interaction test), touch-target ≥44px at 375px, focus ring visible on both header buttons, group
  marker not colour/icon-only (sr-only text present).

### Order of work (why this order)

i18n removal is sequenced WITH Phase 4 (not strictly before, since Phase 1's keys are still
referenced until Phase 4's JSX lands) → Phase 0 (prerequisite data plumbing, independent/parallel-
safe with Phase 1–3) → Phase 2 (pure, cheapest, no dependency on anything else) → Phase 3 (mechanical,
isolated file) → Phase 4 (the restructure, depends on Phase 0's entity field + Phase 2's sort export +
Phase 3's marker; also removes the last i18n usages, so Phase 1's JSON deletion lands in the same
commit/diff as Phase 4) → Phase 5 (design-spec doc sync, depends on Phase 3/4's final shape) →
Phase 6 (Storybook, depends on everything above being real) → Phase 7 (gate).

## Component + state sketch

```
ConversationList
├── header
│   ├── title + totalUnread pill              (unchanged)
│   ├── button "Tạo nhóm mới" (Users icon)     (NEW — only if onCreateGroup)
│   └── button "Tin nhắn mới" (Plus icon)      (unchanged, position now 2nd)
├── search input                               (unchanged)
└── <ul> single list                           (NEW — replaces tablist+tabpanel)
    └── <li><ConversationItem/></li>           (sortConversations(filtered))
        └── group rows: + Users icon + sr-only "Nhóm" (NEW, conversation-item.tsx)
```

State classification: `search` stays local-form `useState` (unchanged); `tab` state is DELETED
outright (no replacement — there's nothing to track once there's one list); server state
(`["messaging","conversations"]` query) unchanged, no new query/key. No Zustand, no new URL state
(`?conversation=` deep-link untouched, confirmed by reading `messaging-screen.tsx` — it only reads
`activeId`/`mobilePane` off the deep-link param, neither of which this story touches).

## Risks, dependencies, open questions

- **R1 (flag to fe-lead)** — Phase 0 touches `domain/entities` + `infrastructure/{dtos,mappers,
  repositories/mocks}`, beyond the packet's "UI-only, presentation only" framing. Additive/
  non-breaking, but is a real scope escalation worth a one-line ack in the packet's `## Status`/
  Dependencies before Phase 0 lands. No ADR needed (no new token/architecture pattern, just an
  optional entity field) but flagging per the "surface architecture/data-contract decisions to
  fe-lead" instruction.
- **[OPEN QUESTION] Mobile touch-target idiom** — Product Contract mentions `max-[820px]:min-h-11`
  as an example; confirm the actual repo-wide idiom for "≥44px on mobile, size-9 on desktop" by
  grepping `min-h-11`/`max-[` usages at implementation time rather than trusting the packet's example
  literally (it may be describing a different component's convention).
- **[OPEN QUESTION] design-spec `createCTA`/`memberCountChip` annotation convention** — no
  `supersededBy`-style marker was confirmed to exist elsewhere in `design-spec.jsonc` during this
  planning pass; implementer should grep for a precedent before inventing a new annotation style.
- **Deep-link / pane-visibility interaction** — no risk found: `?conversation=` handling and
  `pane-visibility.ts` read only `activeId`/`mobilePane`, both untouched by this restructure;
  `handleBack`'s `'[role="tab"], button'` selector degrades gracefully (falls through to the first
  `button`) even before its planned cleanup.
- **`canCreateGroup` wiring** — no risk found: `messaging-screen.tsx` already computes
  `onCreateGroup={canCreateGroup ? () => setCreateGroupOpen(true) : undefined}` and passes it
  through unchanged; this story only moves WHERE that prop renders a button, never touches the gate
  itself (`group-creation-gate.ts` untouched, confirmed no changes planned there).
- **Storybook regression surface is smaller than the packet implied** — `conversation-list.
  stories.tsx` has zero tab-dependent assertions today; the real regression risk is entirely in
  `messaging-screen.stories.tsx`'s 2 tab-click stories (Phase 6).

## Harness Delta

None (design-spec messaging list section sync trong commit).

## Evidence

(chưa có — planned)
