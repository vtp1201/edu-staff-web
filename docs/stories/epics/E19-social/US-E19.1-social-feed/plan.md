# US-E19.1 — Social Feed — Implementation Plan

Status: planned. No production code in this file. Sources: `requirements.md`
(TR-190), `integration.md` (INT-190-01…07), `use-cases.md` (UC-1901…1910),
`spec.md`, `design_src/edu/feed.jsx`, `docs/product/design-spec.jsonc` →
`screens.feed` (~line 3521). Branch `feat/us-e19.1-social-feed` already
claimed — this plan assumes US-E19.2 is either already merged to `main` or
its `ReportContentDialog`/`moderation.di.ts` factories are importable from
`main` at implementation time (verified below in Reuse ledger, item 1).

## 0. Reuse ledger (READ FIRST — do not rebuild any of this)

| # | Existing artifact | Path | How this story uses it |
| --- | --- | --- | --- |
| 1 | `ReportContentDialog` component | `src/components/shared/report-content-dialog/{report-content-dialog.tsx,.i-props.ts,.logic.ts}` | Feed's "…" menu Report item renders this directly with `kind: "post"\|"comment"`, `authorName`, `contentPreview` (already-clamped text), `isSubmitting`, `fieldError?`/`transientError?`/`infoMessage?`, `onSubmit`, `onCancel`. Feed does NOT define a second dialog or a parallel `ReportReasonId` union. |
| 2 | `makeSubmitReportUseCase()` | `src/bootstrap/di/moderation.di.ts` | Feed's own thin `'use server'` `reportContentAction` calls this factory directly — no second submit-report use-case in `features/feed/domain/`. |
| 3 | `makeRemoveContentUseCase()` | `src/bootstrap/di/moderation.di.ts` | Feed's own thin `'use server'` `removeContentAction` calls this factory directly for the Remove menu item — no second remove-content use-case. |
| 4 | `ModerationFailure` union | `src/features/moderation/domain/failures/moderation.failure.ts` | Both thin actions above return `{ errorKey: ModerationFailure["type"] }`; feed presentation translates via `moderation.errors.*` i18n (already exists) — feed does NOT add a parallel error-key namespace for these two actions. |
| 5 | `MODERATION_EP.moderateDeletePost` / `.moderateDeleteComment` | `src/bootstrap/endpoint/moderation.endpoint.ts` | Already wired inside `RemoveContentUseCase`/`ModerationRepository` — feed never imports or duplicates this endpoint constant. |
| 6 | `DestructiveConfirmDialog` | `src/components/shared/destructive-confirm-dialog/` (used by `moderation-screen.tsx`) | Feed's Remove menu item opens THIS shared confirm dialog before calling `removeContentAction` — do not build a third confirm dialog. Same host-controlled-open pattern as `ReportContentDialog`. |
| 7 | `EduSkeleton` / `EduEmpty` / `EduError` | design-system shared state primitives (grep `src/components/shared` for exact names before use) | All 4 required UI states (FR-010) reuse these — no feed-local skeleton/empty/error component. |
| 8 | `USE_MOCK` flag + mock-first DI pattern | `src/bootstrap/lib/mock.ts`, mirrored in `src/bootstrap/di/moderation.di.ts` (`makeRepo()` branching on `USE_MOCK`) | `feed.di.ts` follows the identical `if (USE_MOCK) return new MockFeedRepository(); return new FeedRepository(http)` shape. |
| 9 | Messaging repo real/mock split | `src/features/messaging/infrastructure/repositories/{messaging.repository.ts,mocks/}` | Reference shape for `FeedRepository` (real, all INT-190-01..06) + a separate mock module for INT-190-07 pin/unpin only — do not mock the real endpoints unless BE confirms otherwise (integration.md §4). |
| 10 | `useInfiniteQuery` pattern | `src/features/notification/presentation/notifications-center/notifications-center-container.tsx` (also `audit-log-screen.tsx`) | Cursor-pagination shape (`fetchPageAction({ cursor })`, query-key includes filter/scope) — feed's list-feed hook mirrors this, keyed by `["feed", scope, scopeId, ...]`. |
| 11 | `(shared)/messages` and `(shared)/notifications` routes | `src/app/[locale]/t/[tenant]/(app)/(shared)/{messages,notifications}/{page.tsx,actions.ts}` | Structural reference for `(shared)/feed/{page.tsx,actions.ts}` — RSC page wires container + Server Actions, no business logic in `page.tsx`. |
| 12 | `moderation.reportDialog.*` i18n namespace | `src/bootstrap/i18n/messages/{vi,en}.json` | Already exists — feed's `feed.*` namespace MUST NOT duplicate these keys; the Report menu item label itself (`"Báo cáo"`) IS a feed-owned key (`feed.menu.report`), but dialog internals are not. |
| 13 | ADR 0049 contrast rule | `.claude/rules/design-system.md` | Any destructive/error text or icon (Remove menu item icon, forbidden-error copy) uses `text-edu-error-text`, never `text-destructive`. |

**Verification step for `fe-nextjs-engineer` before Phase 0**: confirm on the
current `main` that items 1–6 above exist exactly as named (US-E19.2 may have
merged with minor naming drift). If any are missing, STOP and flag to
`fe-lead` — do not silently stub a second implementation.

## Phase 0 — Domain (entities, failures, repository interface, use-cases)

Goal: feed's own pure-TypeScript domain, zero HTTP/React deps.

Files:
- `src/features/feed/domain/entities/feed-post.entity.ts` — `FeedPostEntity` (`postId, authorId, authorName, authorRole, authorAvatarUrl, scope: "school"|"class", classId?, content, attachmentUrl?, createdAt, pinned, reactions: { counts: Record<ReactionType, number>; myReaction: ReactionType | null }, commentCount`).
- `src/features/feed/domain/entities/feed-comment.entity.ts` — `FeedCommentEntity` (`commentId, postId, authorId, authorName, authorRole, content, createdAt`).
- `src/features/feed/domain/entities/reaction.entity.ts` — `ReactionType = "like"|"love"|"celebrate"|"clap"` (confirm exact enum values against BE per integration.md open question; keep as a single named export so a rename is a one-file change).
- `src/features/feed/domain/failures/feed.failure.ts` — `FeedFailure = { type: "fetch-failed" } | { type: "forbidden" } | { type: "scope-not-found" } | { type: "validation"; fields?: {field,message}[] } | { type: "network-error" } | { type: "post-not-found" }` + `isRetryableFailure()` (mirrors `moderation.failure.ts` shape — `network-error` only retryable; `post-not-found` used by UC-1903.5/UC-1904.7 concurrent-removal paths).
- `src/features/feed/domain/repositories/i-feed.repository.ts` — `IFeedRepository`: `getSchoolFeed(cursor?)`, `getClassFeed(classId, cursor?)`, `createPost(scope, scopeId, content, attachmentUrl?)`, `setReaction(postId, reactionType)`, `removeReaction(postId)`, `listComments(postId, cursor?)`, `addComment(postId, content)`, `togglePinMock(postId, pinned)` — all return `Result`-style or throw `ApiError` per `.claude/rules/api-integration.md` (repo throws, use-case maps to `FeedFailure`).
- `src/features/feed/domain/use-cases/get-school-feed.use-case.ts`, `get-class-feed.use-case.ts` (or a single `list-feed.use-case.ts` with a scope discriminator param — prefer ONE use-case with `{ scope: "school" } | { scope: "class"; classId }` param over two near-identical classes, per YAGNI/DRY; confirm with `fe-component-architect` if a split is truly needed for query-key ergonomics).
- `src/features/feed/domain/use-cases/create-post.use-case.ts` — validates non-empty content client-side (defense-in-depth mirror of 422), delegates real validation to BE.
- `src/features/feed/domain/use-cases/react-to-post.use-case.ts` — takes `postId, reactionType | null` (null = remove), calls `setReaction`/`removeReaction`.
- `src/features/feed/domain/use-cases/list-comments.use-case.ts`, `add-comment.use-case.ts`.
- `src/features/feed/domain/use-cases/toggle-pin-mock.use-case.ts` — pure, calls `repo.togglePinMock` only (repo implementation decides mock vs future-real; use-case is agnostic per DIP — this is the seam that lets US-101 swap in later with zero use-case change).
- `src/features/feed/domain/policies/can-post.ts` — pure function `canPost(role, scope): boolean` (FR-002 matrix) and `src/features/feed/domain/policies/menu-visibility.ts` — pure function returning `{ canReport, canPin, canRemove }` per UC-1905's role×author matrix (moderator assumption from spec.md §1). Keeping these as pure domain functions (not presentation-inline conditionals) makes them independently unit-testable per TDD and reusable by both post-card and comment-item menus.

Test first (red before any implementation file above):
- `create-post.use-case.test.ts` — empty content → validation failure without calling repo; success path prepends nothing (use-case has no list-mutation responsibility, that's the query layer's job) but returns the created entity.
- `react-to-post.use-case.test.ts` — toggling same reaction removes; toggling different reaction replaces (mock `IFeedRepository`).
- `toggle-pin-mock.use-case.test.ts` — asserts `repo.togglePinMock` called, NEVER any HTTP-shaped method.
- `can-post.test.ts` — table-driven over the 4 roles × 2 scopes matrix (AC-1902.1/.2).
- `menu-visibility.test.ts` — table-driven over UC-1905's role/author-relationship matrix (AC-1905.1–.5).
- `feed.failure.test.ts` — `isRetryableFailure` only true for `network-error`.

Done when: all above unit tests green, `bun vitest run src/features/feed/domain` passes, zero imports outside `domain/`.

## Phase 1 — Infrastructure (DTOs, mapper, repository, mock, DI, endpoints)

Goal: wire `IFeedRepository` against `social` (INT-190-01..05) for real, mock only INT-190-07.

Files:
- `src/bootstrap/endpoint/feed.endpoint.ts` — `FEED_EP` object, `/social/api/v1/...` prefix (same convention as `MODERATION_EP`, NOT integration.md's abbreviated paths — see integration.md header note): `schoolFeed`, `classFeed(classId)`, `reaction(postId)`, `comments(postId)`. Do NOT add a moderate-delete or pin entry here (items 3/6 in reuse ledger own those).
- `src/features/feed/infrastructure/dtos/feed-post-response.dto.ts`, `feed-comment-response.dto.ts`, `reaction-response.dto.ts` — camelCase, mirror integration.md §2 payload shapes exactly (flag any field-name mismatch found during implementation back to `fe-lead`/BE per the open `[OPEN QUESTION]` on unconfirmed `social` contract).
- `src/features/feed/infrastructure/mappers/feed.mapper.ts` — DTO→entity, pure functions, unit-testable without HTTP.
- `src/features/feed/infrastructure/repositories/feed.repository.ts` — `import 'server-only'`; implements all `IFeedRepository` methods except `togglePinMock` against `FEED_EP`; envelope/error handling per `.claude/rules/api-integration.md` (`ApiError.code` branching → throws typed errors caught by use-cases, NOT branching on `error.message`). List methods use `{ raw: true }` + `parseEnvelope()` to read `meta.pagination`.
- `src/features/feed/infrastructure/repositories/mocks/mock-feed-pin.repository.ts` — implements ONLY `togglePinMock` as a pure in-memory/no-op passthrough (returns the flipped entity; no persistence). If `FeedRepository` needs a single class implementing the full interface, compose it as `FeedRepository` (real methods) + mixin/delegate the one mock method — follow messaging's real/mock file-split shape (reuse ledger #9), do not fork a second full mock of all 6 real endpoints.
- `src/bootstrap/di/feed.di.ts` — `import 'server-only'`; `makeListFeedUseCase()`, `makeCreatePostUseCase()`, `makeReactToPostUseCase()`, `makeListCommentsUseCase()`, `makeAddCommentUseCase()`, `makeTogglePinMockUseCase()`, each building `FeedRepository(await createServerHttpClient())` (no `USE_MOCK` branch needed for the real methods since integration.md says these are REAL; pin/unpin always uses the mock method regardless of `USE_MOCK`, since there is no real endpoint at all — document this exception explicitly in the file's doc comment so it isn't read as a stale `USE_MOCK` leftover).
- `src/bootstrap/di/index.ts` — add feed factory re-exports.

Test first:
- `feed.mapper.test.ts` — DTO→entity field mapping, including `myReaction: null` and `pinned: false` defaults.
- `feed.repository.test.ts` (integration tier) — mock HTTP client, assert envelope unwrap, assert `error.code` → `ApiError` → correct `FeedFailure` type mapping for 403/404/422/5xx per integration.md's per-endpoint error tables (INT-190-01..05). Assert `togglePinMock` never issues an HTTP call (spy on http client, zero invocations).

Done when: repository integration tests green; `bun vitest run src/features/feed/infrastructure`; `tsc --noEmit` passes (server-only boundary enforced by build, not just convention).

## Phase 2 — Presentation shell: route, scope tabs, 4 UI states

Goal: `(shared)/feed` route renders scope tablist + one scope's list in all 4 required states, no composer/reactions/comments yet.

Files:
- `src/app/[locale]/t/[tenant]/(app)/(shared)/feed/page.tsx` — RSC; resolves user's classes (existing session/role resolution, reuse whatever `(shared)/messages/page.tsx` uses for role/tenant), passes to container.
- `src/app/[locale]/t/[tenant]/(app)/(shared)/feed/actions.ts` — `'use server'`: `fetchFeedPageAction({ scope, scopeId, cursor })` calling `makeListFeedUseCase()` only — no other logic.
- `src/features/feed/presentation/feed-screen/feed-screen.i-vm.ts` — ViewModel/prop contract: `role`, `classes: {id,name}[]`, `activeScope`, `fetchPageAction`, etc.
- `src/features/feed/presentation/feed-screen/feed-screen.tsx` — `'use client'`: scope tablist (`role=tablist`/`tab`, arrow-key nav per AC-1901.7 — check for an existing `Tabs` shadcn primitive or existing tablist pattern before hand-rolling), renders `EduSkeleton`(3)/`EduEmpty`/`EduError`/populated-list per query state.
- `src/features/feed/presentation/feed-screen/feed-screen-container.tsx` — `'use client'`, owns `useQuery`/`useInfiniteQuery` per scope+scopeId key (mirrors reuse ledger #10), passes VM props down. Query key: `["feed", scope, scopeId ?? "school", ...]`.
- `src/features/feed/presentation/feed-screen/feed-screen.stories.tsx` — interaction stories: loading, empty (canPost true/false variants), error-retryable, error-forbidden (no retry), success, scope-switch.

Test first: Storybook interaction test asserting exactly one primary state renders per query status (AC-1901.1–.5); scope-switch story asserting previous list unmounts and new loading cycle starts (AC-1901.6).

Done when: 4-state stories pass interaction assertions; scope tabs pass keyboard nav check; design-review gate readiness for this slice only (full gate happens at end of story per `docs/DESIGN_REVIEW.md`).

## Phase 3 — Composer + post card + reactions

Goal: FR-002/FR-003/FR-004 (composer visibility, post submit, reaction toggle).

Files:
- `src/features/feed/presentation/feed-screen/components/feed-composer.tsx` — reads `canPost(role, scope)` from domain policy; absent from DOM when false (AC-1902.1/.2); optimistic-prepend mutation via `useMutation` + `onMutate`/`onError` rollback into the `["feed", scope, scopeId]` query cache.
- `src/features/feed/presentation/feed-screen/components/feed-post-card.tsx` — per design-spec `FeedPostCard`; pinned accent border + "Đã ghim" icon+label (FR-008) computed from `post.pinned`, sort applied at the query-select level (domain-adjacent pure sort function `src/features/feed/domain/policies/sort-posts.ts` — pinned-first then `createdAt` desc, unit-tested).
- `src/features/feed/presentation/feed-screen/components/feed-reaction-bar.tsx` — per design-spec `FeedReactionBar`; 4 chips, `aria-pressed`, Vietnamese `aria-label` (NFR-001); optimistic mutation with silent rollback (no toast, AC-1903.4) and special-case 404 → remove post from cache (AC-1903.5).
- `src/app/.../(shared)/feed/actions.ts` — add `createPostAction`, `reactToPostAction` (thin wrappers over `makeCreatePostUseCase()`/`makeReactToPostUseCase()`).
- `feed-composer.stories.tsx`, `feed-reaction-bar.stories.tsx` (or folded into `feed-screen.stories.tsx` if `fe-component-architect` decides composition doesn't warrant separate story files — decide during Phase 2 component-tree handoff).

Test first: reaction-bar interaction test — click add/replace/remove/rollback-on-failure/404-removes-post (AC-1903.1–.5); composer interaction test — role×scope matrix absence (AC-1902.1/.2), 422 inline field error content-preserved (AC-1902.5), 403 distinct copy (AC-1902.6), transient retry (AC-1902.7).

Done when: composer + reaction Storybook interaction suites green; `sort-posts.test.ts` unit-covers AC-1907.1/.2.

## Phase 4 — Comment thread

Goal: FR-005, sub-section states (not full-screen EduEmpty/Skeleton).

Files:
- `src/features/feed/presentation/feed-screen/components/feed-comments.tsx` — per design-spec `FeedComments`; expand-on-demand `useQuery` (or `useInfiniteQuery` IF BE confirms comment pagination — else single `useQuery`, per open question; default to single-page `useQuery` now, swap to infinite later behind the same component boundary since the query hook is internal to this file).
- `actions.ts` — add `listCommentsAction`, `addCommentAction`.
- `feed-comments.stories.tsx` — loading (sub-section skeleton rows), empty ("Chưa có bình luận" inline text, NOT `EduEmpty`), success, validation-error, transient-error, 404-post-gone (thread collapses).

Test first: interaction test asserting the empty state renders inline text not the shared `EduEmpty` component (AC-1904.2 — a real risk of accidental over-reuse, call out explicitly in the story assertion).

Done when: all UC-1904 AC covered by story interactions.

## Phase 5 — "…" menu: pin, remove, report

Goal: FR-006/FR-007/FR-008(toggle)/FR-011/FR-012 — the cross-story integration point.

Files:
- `src/features/feed/presentation/feed-screen/components/feed-menu.tsx` — per design-spec `FeedMenu`; Radix `DropdownMenu`; item set computed from `menu-visibility.ts` (Phase 0); trigger itself absent when the computed set is empty (AC-1905.5); Escape/outside-click dismiss + focus-return to trigger is Radix-native — verify (not re-implement) with a story assertion. **Check whether this manually-controlled-open menu needs `use-dialog-return-focus.ts` (`src/shared/use-dialog-return-focus.ts`, built in US-E11.7)** — if `ReportContentDialog` (reuse ledger #1) does NOT already use this hook, flag to `fe-lead` rather than silently fixing US-E19.2's component; feed's OWN menu/dialogs should use the hook if their open state is manually toggled outside a simple Radix trigger pattern.
- `src/features/feed/presentation/feed-screen/components/feed-pin-badge.tsx` — icon+text "Đã ghim" + the non-blocking "not yet persisted" indicator (AC-1909.3 — see Open Questions below for the exact string to implement).
- `src/app/.../(shared)/feed/actions.ts` — add:
  - `togglePinMockAction` → `makeTogglePinMockUseCase()` (feed's own use-case, local/no-HTTP).
  - `reportContentAction` → `makeSubmitReportUseCase()` (reuse ledger #2) — thin wrapper, translates `ModerationFailure["type"]` to the caller.
  - `removeContentAction` → `makeRemoveContentUseCase()` (reuse ledger #3) — thin wrapper.
- Feed's post-card/comment-item wires: `FeedMenu` → on "Báo cáo" → open `ReportContentDialog` (props per reuse ledger #1) → `onSubmit` calls `reportContentAction`; on "Gỡ nội dung" → open `DestructiveConfirmDialog` (reuse ledger #6) → confirm calls `removeContentAction` → on success, invalidate/refetch the `["feed", scope, scopeId]` query (AC-1910.3) and optionally optimistically drop the item pending refetch (mirrors reaction 404 pattern, AC-1903.5).
- `feed-menu.stories.tsx` — interaction stories per UC-1905's role×author matrix (AC-1905.1–.7), report-invokes-shared-dialog-with-correct-props (AC-1906.1–.3 — assert props only, do NOT re-assert dialog internals per spec.md's explicit instruction), remove-invokes-shared-confirm-then-action (AC-1910.1/.2), pin-toggle-no-network-call + re-sort (AC-1909.1/.2, AC-1907.4).

Test first: `feed-menu` interaction test suite (role×author matrix), a mocked-network-call-count assertion for pin toggle (asserts zero HTTP calls fired — the acceptance-critical proof for INT-190-07/AC-1909.1), and a props-only assertion that `ReportContentDialog` receives the correct `kind`/`contentId`/`authorName`/`contentPreview` (AC-1906.3, explicitly not testing dialog internals).

Done when: all UC-1905/1906/1907/1909/1910 AC covered; zero second dialog/use-case/endpoint introduced (spot-check against Reuse ledger before closing this phase).

## Phase 6 — Pagination, a11y polish, i18n completion, full test pass

Goal: FR-009, NFR-001/002/003/004/005 end-to-end, close remaining AC.

Files:
- `feed-screen-container.tsx` — finalize `useInfiniteQuery` load-more button (`aria-busy`, disabled-while-pending, AC-1908.5), end-of-feed marker (AC-1908.2/.3), inline retry on load-more failure (AC-1908.4).
- `src/bootstrap/i18n/messages/vi.json` + `en.json` — add `feed.*` namespace: scope tab labels, composer placeholder/labels/toasts, reaction `aria-label` template, menu item labels (`feed.menu.pin`/`.unpin`/`.remove`/`.report`), pinned badge label, pin-not-persisted indicator string (see Open Questions — implement the specific recommended string, do not invent a new one), end-of-feed/load-more copy, error copy variants (fetch-failed/forbidden/scope-not-found — distinct per AC-1901.4). Do NOT touch `moderation.reportDialog.*` or `moderation.errors.*`.
- Full a11y pass: `fe-accessibility-auditor` parallel review — tablist, menu, reaction chips, images `alt`, 320px viewport check (Storybook viewport addon), motion-safe check on any transition (pinned re-sort, load-more spinner).
- `docs/TEST_MATRIX.md` — flip Unit/Integration/E2E rows for US-E19.1 to `implemented` once proof exists (per `.claude/rules/tdd.md`).

Test first: none new structurally — this phase is closing remaining AC gaps identified by re-running the full AC checklist (`use-cases.md` §4) against the story suite and filling any gaps found. If a gap surfaces here, write its failing test before filling it (still TDD, just later-discovered).

Done when: all 44 AC in `use-cases.md` §4 have a corresponding passing test/story assertion; `bun vitest run` + `bun build` green; ready for `fe-tech-lead-reviewer` + `fe-accessibility-auditor` parallel gate, then `docs/DESIGN_REVIEW.md` gate, then `fe-qa-playwright`.

## Component + state sketch

```
FeedScreen (RSC page.tsx)
 └─ FeedScreenContainer ('use client', owns TanStack Query)
     ├─ ScopeTabs (role=tablist)
     ├─ FeedComposer (conditional: canPost)
     └─ FeedList (useInfiniteQuery)
         └─ FeedPostCard[] (pinned-first sorted)
             ├─ FeedReactionBar
             ├─ FeedMenu (DropdownMenu: pin/remove/report per menu-visibility policy)
             │   ├─ → ReportContentDialog (imported, US-E19.2)
             │   └─ → DestructiveConfirmDialog (imported, shared) → removeContentAction
             └─ FeedComments (expand-on-demand)
                 └─ comment items, each with its OWN FeedMenu (report-only, no pin/remove on comments per UC-1905 scope — confirm: pin/remove are POST-level only per FR-008/FR-011, comments only ever show Report)
```

State classification:
- **Server state** (TanStack Query): feed list (per scope+scopeId, infinite), comment threads (per postId), all via Server Actions — no client-side fetch() calls.
- **URL state**: active scope tab + active classId (candidate for a searchParam so scope survives refresh/back-nav — flag to `fe-state-engineer` as a design choice, not yet decided; simplest default is local component state if URL persistence isn't in AC).
- **Local-form state**: composer textarea, comment input, report dialog reason/note (owned inside `ReportContentDialog` itself, not feed's concern).
- **No Zustand / global store** — nothing here needs cross-tree client state beyond Query cache.

Hand-off: `fe-component-architect` should confirm the `FeedPostCard`/`FeedMenu`/`FeedComments` prop contracts (`.i-vm.ts` shapes) before `fe-nextjs-engineer` starts Phase 2; `fe-state-engineer` should confirm the query-key structure (Phase 2) and the stale-response guard strategy for rapid scope-tab switching (open question below) before Phase 2 starts, since it affects the container's `useQuery`/`useInfiniteQuery` key design.

## Risks, dependencies, open questions

- **Sequencing risk (blocking)**: this story hard-depends on US-E19.2 already being merged to `main` (Reuse ledger #1–6). If `git log main` doesn't show US-E19.2's merge commit yet, STOP before Phase 1 and tell `fe-lead` — do not stub a parallel `ReportContentDialog`/`makeSubmitReportUseCase`.
- **BE contract risk**: `social` has no published `openapi.yaml` — all field names/enums in Phase 0/1 are inferred from `integration.md`. Any mismatch discovered during Phase 1 repository work should be flagged, not silently reconciled by guessing.
- **[OPEN QUESTION] Pin "not yet persisted" copy (AC-1909.3)**: per `spec.md` §8 / `use-cases.md` §6, this needs `ba-lead`/`uiux-ux-writer` sign-off before the exact string enters `messages/{vi,en}.json`. To avoid blocking the whole story, **this plan directs `fe-nextjs-engineer` to implement the specific recommended string** already carried in the packet: a short, non-blocking, icon+text inline caption near the pin badge — vi: **"Chỉ hiển thị tạm thời trên thiết bị này"**, en mirror: **"Only shown temporarily on this device"** — under key `feed.pin.notPersisted`. If `ba-lead` later confirms different wording, it's a one-key i18n edit, not a re-architecture; note this resolution in the story's Evidence section when implemented.
- **[OPEN QUESTION] Teacher pin/remove scope** ("classes they teach" vs "any class they can view") — `menu-visibility.ts` (Phase 0) should take the teacher's own-class-ids as an explicit input (not hardcode a lookup), so whichever answer US-E19.2 confirms server-side is a one-parameter change here, not a rewrite.
- **[OPEN QUESTION] Comment pagination shape** — default to single-page `useQuery` per Phase 4 note; revisit if BE confirms `meta.pagination` exists on the comments endpoint.
- **[OPEN QUESTION] Stale-response guard on rapid scope-tab switch** — default to relying on TanStack Query's automatic query-key-change cancellation (no explicit `AbortController` wiring) unless `fe-state-engineer` finds a concrete race during Phase 2; flag if extra work is needed.
- **[OPEN QUESTION] `use-dialog-return-focus.ts` gap in `ReportContentDialog`** — per Phase 5, verify at implementation time; if missing, flag to `fe-lead`/US-E19.2 owner rather than patching a shared component inside this story's scope.
- **No new design tokens expected** (`story.md` §Harness Delta already confirms this) — if Phase 3/5 implementation finds a genuine gap (e.g. a pinned-accent color not in `tokens.css`), flag for an ADR before use, per `.claude/rules/design-system.md`.
- **a11y risk**: reaction chips' `aria-label` must be computed dynamically (reaction name + live count) — per `i18n.md`, this is NOT a static i18n key with interpolation issue if handled via `t("feed.reactions.ariaLabel", { reaction, count })`-style ICU message — confirm next-intl ICU pluralization support is already used elsewhere (check an existing count-interpolated key) before assuming the pattern.
