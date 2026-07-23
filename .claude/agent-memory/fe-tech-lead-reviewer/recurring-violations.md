---
name: recurring-violations
description: Issues I repeatedly flag in edu-staff-web reviews — check these early
metadata:
  type: feedback
---

Watch for these (each has bitten a story here):

- **Raw `text-white`/`bg-white` on edu-* surfaces** — engineers reach for `text-white` on
  `bg-edu-error`/`bg-edu-success` instead of the `*-foreground` token. Blocking. See [[conventions]].
  - **Special blocking case: `text-white` on `bg-edu-warning`** (`#ffae1f` yellow) ≈ 1.7:1 contrast —
    fails WCAG 1.4.3 AND the named rule in `accessibility.md` ("KHÔNG đặt text trắng trên --edu-warning
    → dùng --edu-warning-foreground" `#2A3547`). Watch for a single `text-white` shared across a
    button whose bg switches `conflictClass ? bg-edu-warning : bg-edu-primary` — the warning branch
    is the failure. (US-E12.4 add-student-panel transfer button.) Note `text-white` IS established
    precedent on `bg-edu-primary`/`bg-destructive` (shadcn button/badge, subject-catalogue) → only
    SHOULD-FIX there; warning-yellow is the hard gate.
- **Declared-but-unproduced failure types** — a `Failure` union member (e.g. `date-overlap`) with
  an i18n error key but NO use-case path that returns it = an unimplemented AC dressed up as done.
  Cross-check every AC validation rule against an actual `fail({type})` in a use-case.
- **Hardcoded Vietnamese in `.tsx`/actions** — mock-data nouns are fine, but UI-facing default
  strings (e.g. generated term name `Học kỳ N`) sent through the wire are borderline; flag if the
  string is user-visible copy rather than seed data.
- **`new Date()` in client handlers** for default values — non-deterministic; acceptable for a
  user-editable default but note it (the value becomes a real-clock dependency in any test).
- **Duplicate/placeholder i18n copy** — same message reused for two distinct slots (e.g. an info
  callout reusing `addYear.subtitle`) usually signals a missing dedicated key.
- **Dead i18n keys that PASS parity** — keys present in both vi+en (so the parity diff is clean) but
  never referenced in any `.tsx` (e.g. `table.loadMore`, `homeroomSheet.loading`, duplicate
  `actions.confirm`/`cancel` when the dialog uses scoped `archiveDialog.confirm`). Parity check alone
  won't catch them — grep each leaf key against presentation. Often signals a half-wired feature (a
  VM carrying `hasMore`/`nextCursor` with no load-more control rendered). SHOULD-FIX. (US-E12.10.)
- **One action bypassing its use-case** — when 3 of 4 server actions call `new XUseCase(repo).execute()`
  but one calls `repo.method()` directly (leaving the use-case as dead code). Pattern-inconsistency,
  not a correctness bug, but flag it — the bypassed use-case usually existed for a reason (validation
  that silently won't run). Cross-check every action wires through its use-case. (US-E12.10 archive.)
- **Bare `status === NNN` fallback in failure mapping** — `toFailure` branching `status === 422 →
  grade-out-of-range` after the code branch means ANY 422 (generic validation) gets mislabeled. Prefer
  letting non-matched codes fall through to `unknown`; status fallback should only cover transport
  categories (network/forbidden), not domain-specific 422/409. (US-E12.10.)

- **Repo methods implemented but never wired = dead AC** — a repo interface method (e.g.
  `listClasses`, `getClassSubjects`) implemented in BOTH real + mock repos but never exposed via a
  use-case/DI factory/action/page, while the screen instead uses a hardcoded `FALLBACK_*` /
  `MOCK_*_FOR_PICKER` const inside the `'use client'` file. Two violations at once: (a) the data-AC
  (picker fed by real list, availability filter) is unimplemented; (b) mock data lives in a
  production client code path (not a `*.mock.*`/server-only mock repo). tsc/tests stay green because
  the dead methods still type-check and the const renders. Cross-check: every repo interface method
  must trace to a consumer; grep `methodName` outside the repo impl/interface/test. (US-E13.5.)

- **Dead interactive button (no onClick)** — a per-row `<Button>` rendered with an `aria-label`
  + label but NO handler, when the real action lives elsewhere (e.g. discipline "Thông báo phụ huynh"
  per-row button while parent notification actually fires from the form's `notifyParent` toggle). A
  focusable control that does nothing = a11y/UX defect. SHOULD-FIX: wire it or remove it. Cross-check
  every `<Button>`/clickable for an `onClick`/`type=submit`/`asChild` link. (US-E09.1.)
- **`text-white` on `bg-edu-error` (count badge / chip)** — token violation; `--edu-error-foreground`
  (#fff) exists → fix `text-edu-error-foreground`. SHOULD-FIX when value is identical (coral, contrast
  fine); only the warning-yellow variant is a hard gate. (US-E09.1 tab count badge.)
- **`text-white` initials on a role/child-colored avatar circle where the color set INCLUDES
  `warning`** — e.g. `ChildColor = primary|success|warning|error|purple` with `text-white` on
  `backgroundColor: var(--edu-warning)`. Warning-yellow + white ≈ 1.7:1 fails the named a11y rule.
  Mitigant: if the initials are `aria-hidden` decorative AND the child name/class is shown as
  adjacent real text (so meaning isn't color/avatar-only), it's CONSIDER not blocking — but still
  flag, since the visible glyphs are sub-AA. (US-E13.7 ChildSwitcher avatar.)
- **New use-case + DI factory + endpoint added but zero callers (page wiring deferred)** — valid
  contract-first scaffolding ONLY when the story explicitly scopes out page sourcing (check the
  packet "Out of Scope"). Then it's a tracked follow-up, not dead code — but the AC are proven only
  at Storybook/VM level, NOT end-to-end. Verify the deferral is written in the packet before
  accepting; otherwise it's a half-wired feature. (US-E13.7: getChildList/makeGetChildListUseCase/
  GRADES_EP.childList unused; parent page + grade-book-container untouched — deferral is in spec.md.)

- **Read/query Server Actions missing `requireRole`** — engineers guard the mutations but leave
  the `get*`/`list*` actions unguarded, assuming the `/admin` layout role-guard covers them. It does
  NOT: Server Actions are independently invocable POST endpoints; the layout only guards RSC page
  render. Unguarded reads leak seal status, audit trails (who/when — Nghị định 13 sensitive), tenant
  admin rosters + student lists (PII) to any authenticated non-admin. EVERY new Server Action in a
  role-gated route needs its own `requireRole`. Blocking in high-risk lanes. (US-E14.6 actions.ts:
  6 read actions unguarded, only seal/initiate/confirm guarded.)
- **Two-person / co-sign gate bypassable via a "self-approve fallback" that isn't count-gated** —
  the fallback (single-admin tenant → self-approve) affordance is rendered/allowed whenever
  `isOwnRequest`, NOT gated on `tenantAdminCount === 1`, AND the use-case skips ALL checks when
  `coSignerId === null`. Result: in a multi-admin tenant the initiator self-approves alone, fully
  defeating the two-admin gate (the whole point of the ADR). The VM even carries `tenantAdminCount`
  but it's never threaded to the card. Check BOTH: (a) UI only offers self-approve when count===1;
  (b) the confirm use-case/repo re-verifies count===1 server-side on the `coSignerId===null` path
  (defense-in-depth — actions are directly callable). (US-E14.6, ADR 0037.)

- **`useInfiniteQuery` status collapse wipes loaded rows on a failed `fetchNextPage`** — deriving a
  single mutually-exclusive `status = query.isError ? "error" : ...` and rendering ONLY an error
  banner for it. In RQ v5 a failed `fetchNextPage` (or a background refetch after `staleTime`) sets
  `isError=true` while KEEPING `data.pages`, so the whole list is replaced by the error banner even
  though rows are still loaded — violates cursor-pagination AC ("load-more failure must not wipe
  loaded rows") and the append-only UX. Fix: gate full-screen error on first page only
  (`isError && events.length === 0`, or `isLoadingError`); surface `isFetchNextPageError` as an
  inline retry near the load-more button while keeping the table rendered. Note the load-more button
  itself often disappears too (rendered only when `status==="success"`). Tests/tsc stay green because
  no interaction test exercises a page-2 failure. (US-E12.12 audit-log-screen.tsx.)

- **Verbatim copy of a small presentation sub-component across sibling screens in the SAME feature**
  — when a new screen mirrors an existing one (e.g. `TeacherScheduleScreen` alongside `TimetableView`
  in `features/timetable/presentation/`), engineers copy the little internal helpers (`ExportPdfButton`,
  `ReadOnlySelectors`, `ReadOnlyField`, error-banner block) byte-for-byte into the new file rather than
  extracting a shared one. tsc/lint/tests stay green. Decision 0026 case (d) — "feature-local component
  copied to a 2nd screen instead of promoted to shared" → Revision Required trigger. Watch specifically
  for identical `<Button>`+toast helpers and identical read-only-field wrappers. Fix: extract to a shared
  module (feature-local shared file or `components/shared/`) and import in both. (US-E15.2 ExportPdfButton
  copied from timetable-view.tsx into teacher-schedule.tsx verbatim.)

- **`raw: true` nested inside `params` instead of top-level axios config** — the interceptor's
  `isRawCall` reads `config.raw` at the TOP level (`http.get(url, { params: {...}, raw: true })`),
  NOT `params.raw`. Engineers writing paginated/list calls put `params: { status, raw: true }` →
  `isRawCall` sees `undefined` → the envelope gets unwrapped BEFORE `parseEnvelope`, so
  `parseEnvelope` receives an already-unwrapped array and every real-mode list call falls into
  `network-error`. tsc/unit-with-mocked-http stay green because a hand-mocked `http.get` never runs
  the real interceptor. Blocking. Guard = a test that runs the REAL `unwrapResponse` against the
  config (describe "real interceptor pipeline (raw-flag placement)"). Precedent: calendar.repository
  US-E18.1 (correct), staffing.repository US-E18.2 round-1 (5 call sites had it nested → fixed).
- **BE-derived fields fetched per-call via full pagination** — when the BE contract drops a field the
  UI needs (e.g. `activeAssignmentCount`, joined `positionTitleName`) and offers no server-side count
  or filter, the repo may page the whole ACTIVE-assignments list on EVERY list AND get-by-id call to
  derive it (`Promise.all([entityCall, fetchAssignmentCounts()])`). Correct + documented, but O(all
  assignments) per read — non-blocking perf nit worth flagging for a follow-up (server count field).
  Also watch the display-name fallback (`memberName = memberId` when IAM has no name source): a
  documented cross-repo gap, non-blocking, but the UI shows a raw id until BE closes it. (US-E18.2.)

- **Icon-only control below the 44×44 touch-target floor because design-spec says smaller** — a
  design-spec/mockup specifies a small icon button (e.g. banner dismiss "X" at 26px) and the engineer
  ships it as `size-8` (32px) or less. `.claude/rules/accessibility.md` hard rule = "Touch target ≥
  44×44px trên mobile"; design-system supremacy covers tokens/palette/layout, NOT the a11y target
  floor. Fix = keep the visual footprint per spec but expand the hit area to ≥44×44 (padding / larger
  tap surface, small inner icon). MUST FIX (a11y hard gate). Converges with fe-accessibility-auditor.
  (US-E22.1 EmailVerifyBanner dismiss `email-verify-banner.tsx:130` size-8; banner send/resend inline
  controls also compact — auditor owns full sweep.)

- **Spec copy silently dropped instead of adding the missing i18n key** — when `design-spec.jsonc` /
  the reference mockup / an AC specifies literal display copy (e.g. card title `"Bài tập: {title}"`,
  or a zero-state subtitle variant `pendingCount 0 → "Không có bài tập nào cần nộp"`) but no staged
  i18n key exists for it, engineers render the raw value (bare `{title}`) or reuse the non-zero key
  ("Còn 0 bài…") rather than ADD the key in both vi+en. tsc/tests/parity stay green (no new key = no
  drift). This is a design-spec/AC conformance gap, not a nit — design-spec is normative/supreme. Fix
  = add the key to both locales and use it. Cross-check every design-spec `title`/`subtitle`/label
  literal against the rendered output, not just against existing keys. (US-E11.7 assignment-card title
  prefix missing in card + both sheets; header zero-state subtitle.)
- **Header/count state seeded into `useState` and decoupled from the query cache** — a page-header
  count (`pendingCount`) initialized from an RSC prop into `useState` then only mutated by hand
  (decrement on submit) never re-syncs with the authoritative query data after a client cold-fetch,
  so it's wrong whenever the RSC seed failed or the list refetches. Acceptable for a mock-first MVP
  happy path but flag as CONSIDER. (US-E11.7.)

- **Toast error-key narrowing switch silently drops spec-mandated INLINE field errors** — a
  `toErrorMsgKey()`-style switch that collapses every failure not in a small whitelist to a generic
  `unknown` toast. Fine for defensive/client-prevented codes (body-too-long, tag limits — the UI
  blocks them first), but it also swallows genuinely-reachable server races the spec's error→UI table
  maps to an INLINE field error. Classic case: `subject-not-found` on create (subject archived between
  page-load and submit) → spec §6.5 wants inline-on-subject-selector, code shows generic toast; the
  meta-grid even had an unused `subjectError` prop plumbed. SHOULD-FIX (edge race, still surfaced
  non-silently, not a crash). Cross-check the error→UI mapping table for any row that says "inline on
  X field" and confirm that path isn't collapsed to a toast. (US-E11.9 use-question-bank-builder.ts.)
- **Debounced-gate list flashes emptyFiltered during the debounce window** — search screen derives
  the gate/prompt visibility from the IMMEDIATE filter value but keys/enables the query off the
  DEBOUNCED value. Typing a tag flips the gate off instantly while the query stays disabled for the
  debounce interval → `cards.length===0 && scope==="search"` renders the "no results" empty state for
  ~350ms before the request even fires. CONSIDER: treat debounce-pending (immediate-satisfied but
  not-yet-debounced) as a loading state. (US-E11.9 question-bank-list-screen.tsx.)

- **Radix Dialog opened from a `DropdownMenuItem` without `e.preventDefault()` in `onSelect`** — the
  menu's default select closes the menu and returns focus to the trigger, racing the Dialog's
  focus-trap → ESC-dismiss / focus-return can misbehave even though the dialog visibly OPENS. Interaction
  stories that only assert "dialog appears" pass while the a11y dismiss AC is unverified. When a story has
  an ESC-dismiss/focus AC (AC-10/NFR-002), require a committed interaction test that opens via the
  `menuitem`, presses Escape, asserts dialog gone AND focus back on the trigger. (US-E23.1 header.tsx.)
- **Uncommitted fix / untracked debug `*.stories.tsx` left in the working tree** — always `git status`
  at review start. A functional fix living only in the working tree (not in `main..HEAD`) won't merge;
  untracked `*audit*.stories.tsx` / stories containing `console.log` must never be committed. Note: the
  tree can change under you mid-review if a parallel `/fe` session is active — re-check `git status` +
  re-run this story's storybook against clean HEAD before finalizing. (US-E23.1.)
- **Full storybook-vitest suite has broad PRE-EXISTING failures** — many unrelated story files
  (lesson-bank, discipline, timetable, announcements, messaging…) fail both in the full run and in
  ISOLATION with a real Radix error (`A <Select.Item /> must have a value prop that is not an empty
  string`) plus worker contention. Don't attribute these to the story under review — confirm by running
  the story's OWN files in isolation (they pass) and spot-check one unrelated failing file in isolation
  (still fails). Flag as repo-health to fe-lead, not a per-story blocker. (Observed US-E23.1, 2026-07-19.)

- **Contract-remap / force-mock / invented-default US landing without a registered ADR** — in the E18
  BE-wiring epic every comparable US registered a decision (`0058` attendance remap, `0059` invitation,
  `0060` messaging rooms). A US that rewrites a wire contract (SSE event union), makes a force-mock
  permanent, invents a default with no product/design-spec value (presence 5-min recent-window), OR
  documents an auth-model incompatibility (ADR-0047 direct-bypass 401) MUST register an ADR + add its
  `docs/TEST_MATRIX.md` row + flip its `EPIC-OVERVIEW.md` row off "Blocked/planned". `git diff --stat
  main..HEAD -- docs/decisions/ docs/TEST_MATRIX.md` = empty is the tell (the story's own Harness Delta
  usually mandates these). Flag as pre-close blocker even when code + gates are green. (US-E18.18.)
- **"The browser deduplicates the EventSource connection" is FALSE** — `new EventSource(sameUrl)` opens a
  SEPARATE HTTP connection every time; there is no URL-based dedup. So a feature-level hook that opens its
  own `useRealtimeEvents`/`new EventSource` (e.g. messaging-screen inbound-typing, notifications-center
  `use-notification-new-event.ts`) stacks a 2nd/3rd live stream on top of the AppShell's global one when
  co-mounted. Real BE enforces `TOO_MANY_SSE_CONNECTIONS` (429). Precedent exists so it's not novel-blocking,
  but flag it: prefer threading the callback (onTyping) through the single shell subscription (context) over
  a second connection. (US-E18.18 messaging-screen.tsx + use-notification-new-event.ts:47 stale dedup claim.)

**Why:** these slip past tsc/lint/tests (all green) but violate AC or design-system gates.
**How to apply:** run the AC-rule ↔ failure-path cross-check and a raw-color grep on every UI story
before reading for style.
