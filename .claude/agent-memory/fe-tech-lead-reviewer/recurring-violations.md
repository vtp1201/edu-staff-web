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

- **Consolidation/extraction stories leave the survey incomplete + dangling doc refs** — when a
  story promotes N feature-local copies into `components/shared/`, the packet's Investigation grep
  usually misses 1–2 instances in unrelated features, and the *surviving* copies keep doc comments
  pointing at the now-DELETED originals (e.g. `features/user/.../consent-section/consent-error.tsx`
  still says "NOT promoted from `PLError`" after `pl-error.tsx` was deleted by
  INFRA-shared-list-states). Always re-grep the pattern yourself (`role="alert"` + `AlertTriangle`,
  `role="status"` + `Skeleton`, `sr-only role="status"`) AND grep for the deleted component names in
  comments. Also watch for the residual case where the shared component exists but each call site
  still passes the SAME long class literal (`SD_LIST_ERROR_CLASS` duplicated verbatim in
  student-absences-screen.tsx) — decision 0026's class-repetition smell survives the refactor; ask
  for a preset/`shape` prop.
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
- ~~**Full storybook-vitest suite has broad PRE-EXISTING failures**~~ — **STALE, fixed.** Observed
  US-E23.1 (2026-07-19) with Radix `<Select.Item value="">` errors + worker contention across
  lesson-bank/discipline/timetable/announcements/messaging. Re-verified 2026-08-01 (US-E18.28):
  `bunx vitest run --config vitest.storybook.mts` is **fully green, 151 files / 1108 tests**. So a
  storybook failure now IS attributable to the story under review — don't wave it off as repo health.
  (Console noise like `<tfoot> cannot contain a nested <p>` still prints on pass; that's separate.)

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

- **design-spec `fields[].type` silently substituted with a different control** — the per-screen
  `design-spec.jsonc` `createForm/setForm.fields[]` array declares each field's control `type`, and
  engineers swap it for whatever is quickest: `"type":"select"` (+ a named options const) shipped as a
  free-text `<Input>`; `"type":"segmented (A/B/C)"` shipped as a `<Select>` dropdown. tsc/lint/tests/
  i18n-parity ALL stay green because no key changes and the value still round-trips. Decision 0011 makes
  the design-spec entry normative for per-screen layout → real conformance gap, not a nit. Check every
  `fields[]` entry's `type` against the rendered control, not just that the field exists. Two rebuttals
  engineers offer that usually DON'T hold: (a) "no i18n option-label keys were authored" — if the option
  labels are stored as the wire VALUE (free-text column) they are mock/seed DATA, explicitly excluded
  from i18n, so zero new keys are needed; grep the fixtures, the labels are often already there verbatim;
  (b) "no segmented primitive exists" — `components/ui/toggle-group/` EXISTS with ≥4 feature precedents
  (attendance-status-toggle, term-radio-group, invitation-role-radio-group, qb-question-type-selector).
  (US-E09.5 create-violation-dialog `category`; severity/rating segmented→Select.)
- **Field-error copy borrowed from a sibling field's key instead of adding one** — a `note`-required
  validation reusing `discipline.errors.missing-description` renders "Vui lòng nhập mô tả vi phạm"
  ("enter a violation description") on a CONDUCT-NOTE field. Exhaustive switch looks tidy and typed, so
  it passes review-by-skim. Fix = add `staffDiscipline.errors.missing-note` in vi+en. Cross-check every
  `case`/`default` in a `use*ErrorMessage()` switch where two distinct fields map to ONE key.
  (US-E09.5 `sd-error-message.ts` `useSDFieldErrorMessage` note/description collapse.)
- **Pending-label key authored but only wired for SOME actions** — `actions.submitting`/`approving` used
  via `isBusy ? t("submitting") : t("submit")` on row buttons while the sibling `actions.rejecting` stays
  dead because the reject confirm only sets `disabled`+`aria-busy` with a static label. Dead key + a11y/UX
  inconsistency across three buttons doing the same class of thing. (US-E09.5.)

- **`not-found` (404-race) mutation branch closes the confirm dialog with NO user feedback = silent
  false success** — the spec/AC almost always says "toast + refetch" for the 404 race, and engineers
  implement only the refetch: `onError` → `if (errorKey === "not-found") { setTarget(null);
  invalidate(); return; }`. The dialog vanishes exactly as it does on success, so on an IRREVERSIBLE
  action the actor concludes it worked. Tell-tale pair: authored-but-dead `form.recordSuccess`/
  `form.editSuccess` i18n keys and zero `from "sonner"` import in the whole feature. `toast` IS
  available and the named precedent (`parent-links` `unlinkMutation`) uses it — so the omission is a
  gap, not a toolchain limit. Cross-check EVERY `onError` branch that closes a dialog for a visible
  message. Blocking when the mutation is terminal/irreversible. (US-E09.6 flag mutation.)
- **`aria-invalid` + inline message shipped but "field retains focus" silently dropped** — an AC that
  says "inline error renders on the X field AND the field retains focus" gets only the first half:
  the guard runs in the submit handler, so focus stays on the submit button. Zero `useRef`/`.focus()`
  in the feature is the tell. The interaction story passes because it asserts `aria-invalid` +
  "no request sent" and never `toHaveFocus()`. SHOULD FIX; converges with the a11y auditor.
  (US-E09.6 `submitRecord` future-date/duplicate guards, AC-003.3.)
- **Page `title`/`subtitle` key reused as a stat-card label / dialog description** — when the authored
  namespace has no `stats.total` (design-spec names the metric only prosaically, e.g. "3-up StatCard:
  total absences / unexcused / flagged") engineers reach for `t("title")`, so the h1 copy renders twice
  on one screen; likewise `t("subtitle")` becomes a `DialogDescription`. Passes parity + tsc (no new
  key). Fix = add the dedicated key in vi+en. SHOULD FIX. (US-E09.6 `sa-stats-row.tsx`,
  `sa-absence-form-dialog.tsx`.)
- **Additive optional prop on a `components/shared/` component without updating THAT component's own
  `.stories.tsx`** — e.g. `errorSlot` (2 tones + a confirm-force-disable behaviour) added to
  `publish-confirm-dialog` and covered only from the consuming feature's stories.
  `component-organization.md` requires the shared component's own story to gain the new state.
  Non-breaking for existing consumers (verify they don't pass the prop), so SHOULD FIX. (US-E09.6.)

**Why:** these slip past tsc/lint/tests (all green) but violate AC or design-system gates.
**How to apply:** run the AC-rule ↔ failure-path cross-check and a raw-color grep on every UI story
before reading for style.

- **Story closed in code but the packet's own Harness Delta doc edits never land** — `docs/TEST_MATRIX.md`
  row left at `planned` with an EMPTY proof column, `docs/product/screens.md` gap flag (e.g. NEW-02)
  left un-flipped, packet `## Status` still `planned`, even though tsc/tests/build are all green.
  `tdd.md` forbids `implemented` without proof, and the Harness Delta usually names the exact doc line.
  Tell: `git diff main...HEAD -- docs/TEST_MATRIX.md docs/product/screens.md` shows the row ADDED as
  `planned` and nothing else. Pre-close blocker, cheap to fix. (US-E12.13, echoing US-E18.18.)
- **Design reference `disabled={isArchived}` / read-only-when-terminal silently dropped on a NEW screen**
  — a mockup (`design_src/edu/<slug>.jsx`) gates every input AND the save bar behind a terminal-status
  flag, but a behavior-preserving extraction from an older Sheet (which never had the flag) inherits the
  always-editable body, so the new page lets an admin edit + save an ARCHIVED record. Neither the
  use-case nor the mock repo guards it, and the `subject-archived` failure member is never produced.
  "It matches the Sheet" is NOT a defense when the mockup specifies the NEW surface. Cross-check every
  `disabled={...}`/conditional-render in the reference jsx against the implementation. (US-E12.13.)

- **Client-side "drain-and-filter" that `slice(0, limit)`s while advancing a PAGE-granular cursor
  silently DROPS rows** — when BE has no `?read=false`/status filter and the repo pages at `limit=100`,
  filters client-side, then returns `items: collected.slice(0, limit)` with `nextCursor` = the last
  page's real cursor, every matching row beyond `limit` inside that page becomes unreachable ("Load
  more" resumes past them). Feature page sizes are small (`PAGE_SIZE = 8`) vs a 100-row drain page, so
  it triggers for any user with ≥9 matches in the first page. ADRs describe this as "less efficient,
  not incorrect" / "may re-surface an already-seen row" — reality is the opposite (loss, not duplicates).
  Minimal fix: return `collected` UNCAPPED (the loop already breaks at `>= limit`, so overshoot ≤ drain
  page size and the cursor stays page-aligned → no duplicates). Tests miss it because the "reports the
  real hasMore" case uses exactly `limit` matches. (US-E18.25 `notification.repository.ts` `drainUnread`.)
- **A deliberately-raw `throw new Error(...)` invariant guard collapses to `errorKey:"unknown"` at the
  Server Action boundary** — actions map failures via `const f = err as Failure; return f?.type ?? "unknown"`,
  so a guard thrown as a plain `Error` (MAX_BATCHES/MAX_PAGES style) is indistinguishable from any other
  unknown failure AND is never logged (the action swallows it). The guard's "surface loudly" intent is
  only half met — ask for a `console.error`/logger on the guard branch or a dedicated failure member.
  (US-E18.25 `markAllRead` + notifications `actions.ts:66`.)

- **Two features casting the SAME URL to incompatible DTOs** (US-E18.26): `timetable`'s ground-truthed
  `LinkedStudentItemDto` vs `parent-links`' speculative `LinkedStudentResponseDto` — both GET
  `/core/api/v1/members/{id}/linked-students`, one expects `{links:[...]}`, the other a bare array with
  `fullName`/`studentId` that the real BE never returns. The stale feature's doc comment still claims
  "flipping USE_MOCK=false needs no rework". When a US ground-truths an endpoint, grep the URL across
  ALL features and flag every other consumer's DTO as drift (follow-up, not a block on the scoped US).
- **E18 un-mock: a VISIBLE, EDITABLE field with no wire path = silent false success** (US-E18.28
  exam-bank `builder-header.tsx` Subject select + Max attempts input). Engineers correctly handle the
  omissions they were *told* about (reorder controls removed + `role="note"` explainer; gradeLevel/
  marks never in the UI) and miss the fields that were *already* on screen — because the screen was
  previously unreachable in real mode (`if(!USE_MOCK) return <XUnavailable/>`), so the US that makes it
  reachable is what turns a dormant field into a live regression. Tell: `buildCreateInput()` collects a
  field that the repo's PATCH body doesn't send (`subjectId` immutable server-side, `maxAttempts` has no
  wire field), followed by an unconditional `toast.success`. Blocking when the story's own Design Notes
  say "must not silently no-op" — and the fix is usually the flag pattern the engineer already built in
  the same commit (`reorderEnabled` → `metaEditable`). Always diff "fields the UI collects" vs "fields
  the wire body sends" on any un-mock US, and check which screens the US newly makes reachable.
- **`core`'s DTO-tag validation returns `code:"VALIDATION_FAILED"`, NOT a domain code** (verified
  `pkg/kit/response/error.go:33-37`: `*apperror.ValidationError` → 422 + `VALIDATION_FAILED` + `fields[]`;
  only `*apperror.AppError` gets `codeFromKey(message)` = UPPER_SNAKE). So a client that skips a
  pre-submit check hits the *tag* validator, not the domain error, and every feature `toFailure` that
  maps only domain codes collapses it to `"unknown"` — a translated but content-free "unknown error".
  When a story claims "the server's own validation surfaces a legible message", check whether the
  failing field trips a `validate:"required,min=..."` tag (→ VALIDATION_FAILED → unknown) or a domain
  guard (→ specific key). Worse when the repo does a NON-ATOMIC multi-call sequence: earlier writes
  already persisted when the generic error fires. Consider mapping `VALIDATION_FAILED` explicitly.
- **`docs/TEST_MATRIX.md` row missing for an E18 story** keeps recurring (US-E18.18, US-E12.13,
  US-E18.26). Cheapest possible check: `grep -oE "^\| US-E18\.[0-9]+" docs/TEST_MATRIX.md | sort -u`
  — every sibling has a row, so an absent one is unambiguous. Pair it with the packet's `## Status`
  still reading `planned`. Always a pre-close item.
- **Wire failure mapped at the auth layer but with no home in the consuming feature's union** —
  e.g. `IamMemberFailure` has `{type:"forbidden"}` (from `forbidden_action`) but the feature's
  `toInvitationFailure` has no `case "forbidden"`, so a real 403 collapses to `unknown` and renders
  the generic "could not load" + a retry button that can NEVER succeed. Two smells at once: an
  explicit RBAC acceptance criterion unmet, and a retry affordance on a permission error. Also check
  the test: `expect(!result.ok).toBe(true)` (without asserting the exact failure type) is the weak
  assertion that lets this through. (US-E18.29.)
- **Silent unknown-enum default to a MEANINGFUL status** — `INVITATION_STATUSES.includes(x) ? x :
  "pending"` in two mappers means a future BE value renders as an actionable row. Prefer a neutral
  status or an explicit widening. (US-E18.29.)
- **Local `function Pagination(...)` copied into a sibling screen** — decision 0026 (d) again, same
  class as the US-E15.2 ExportPdfButton copy. Tell: grep `function Pagination(` /
  `rounded-\[7px\]` — the new screen's copy is byte-identical except the `useTranslations` namespace
  and a size tweak. Also copied alongside it: the 2-entry `STATUS_TONE = {active:"success",
  transferred:"muted"}` map. Both need one canonical home (shared component with pre-translated
  label props / a feature-local tone module). Revision Required trigger. (US-E13.9, copy of
  `teacher-class-students-screen.tsx`.)
- **Partial-degrade aggregate whose all-classes-failed state falls into the "no data assigned"
  empty copy** — a fan-out use-case that returns `{rows:[], failedClassCount:N}` is rendered by
  `rows.length===0 → EmptyState(t("empty"))` where `empty` reads "you have no classes assigned".
  Factually false, and the use-case's OWN unit test proves the state reachable. Require a
  `failedClassCount>0 && rows.length===0` branch with its own key. (US-E13.9.)
- **Header result count shows the UNFILTERED total while only the sr-only live region reflects the
  filter** — sighted/SR parity gap on any client-filtered list. CONSIDER→SHOULD. (US-E13.9.)

- **"The endpoint is member-scoped, therefore role-agnostic" — resource scoping ≠ authorization
  scoping** (US-E15.3, blocking). A packet declares a reuse "ground-truthed, no BE gap, no mock-first
  needed" because an existing caller (parent→child) already succeeds against
  `GET /members/{memberId}/timetable`, and infers a NEW caller (principal→teacher) will too. The path
  parameter says nothing about the `authorize()` allow-list, which was ADMIN / self / linked-PARENT
  only. Compounding failure mode: when the BE deliberately makes 403 existence-opaque, the web repo
  maps 403 → `not-found` → the EMPTY state, so the unauthorized caller sees a plausible "nothing
  published yet" on every row instead of an error — silent, and invisible to tsc/tests/build/storybook
  because mock mode answers happily. Checklist for any story that adds a NEW ROLE as a caller of an
  EXISTING endpoint: (1) read the BE `authorize()`/RBAC branch, not just the route+response shape;
  (2) confirm the new role's BE role string is even present in that package's constants
  (`MANAGER` usually is not); (3) trace 403 → `toFailure` → data-state and check it isn't collapsed
  into empty/success. Sanctioned remedy = the `principal-classes.di.ts` force-mock precedent (DI
  force-mock + doc comment citing the Go file + env-matrix DI test + cross-repo ask), never a silent
  real-mode ship.

- **"Promote to `components/shared/`" refactor that BAKES ONE call site's utility class into the
  shared component** — the classic tell is a size/weight class hard-coded outside the size map, e.g.
  `<AvatarFallback className={cn("text-xs", toneClass)}>` in `child-identity-header.tsx`. Call site A
  (consent card) had `text-xs` explicitly, call site B (parent-dashboard) had NONE and therefore
  inherited the shadcn `AvatarFallback` default `text-sm` → after promotion B's initials silently
  shrink 14px→12px. Nothing catches it: tsc/lint green, i18n untouched, and the "guards the refactored
  call site" Storybook story only asserts `getByText("A")`, never the class/size. **Method that works:
  for each promoted call site, diff its ORIGINAL className list against `cn(defaults, sizeMap, props)`
  and resolve tailwind-merge by hand — including classes the original OMITTED (the primitive's own
  defaults are part of the original rendering).** Fix = move the size-varying class into the existing
  size map (`md:"text-xs"`, `lg:"text-sm"`), never a constant. (US-E20.4.)
  - Corollary: a promotion whose target call site has NO existing `.stories.tsx`/test (parent-dashboard)
    has zero regression lock — read that diff by hand, don't lean on the suite.
- **"Audit EVERY consumer" ACs get a PARTIAL audit — grep the ENDPOINT STRING, not the feature**
  (US-E18.30). When a BE field lands that makes a client fan-out obsolete, the engineer fixes the
  repos the packet NAMED (+ a self-found bonus) and misses the ones that hit the same URL from an
  unrelated feature. Two live real-mode misses on `/core/api/v1/classes`:
  `teacher-dashboard.repository.ts` `getTotalStudents` (same DTO the engineer *edited*, whose
  mapper-test fixture he even updated) and `admin-roster` `roster.repository.ts` `getClasses`.
  Tell: the surviving fan-outs' doc comments now assert the OPPOSITE of the new contract
  ("the wire carries no student-count field"), which tsc/tests can never catch. Method:
  `grep -rn "<literal endpoint path>" src/` + grep the endpoint-constant name across ALL
  `*_EP` objects (`TEACHER_EP.classes` and `CLASS_EP.classes` and `ROSTER_EP.classes` are the
  SAME string). Also sweep for newly-dead artifacts the removal orphaned
  (`enrollment-response.dto.ts`, `CLASS_EP.classStudents`).
- **Point-free `list.map(Mapper.toX)` immediately after removing `toX`'s 2nd parameter** — safe
  today, but `map` passes `(el, index, array)`, so the day anyone re-adds an optional 2nd param
  the row index is silently bound to it. Ask for `.map((d) => Mapper.toX(d))`. CONSIDER-level.
  (US-E18.30 `class-management.repository.ts`, `principal-teachers.repository.ts`.)
- **"No mapping exists, this needs a design decision" for a BE role enum — CHECK `role-meta.ts` FIRST**
  (US-E18.31). `src/features/auth/domain/entities/role-meta.ts` `ROLE_ENUM_TO_APP` is the CANONICAL
  IAM-enum→appRole map and already decides `ADMIN→principal`, `MANAGER→principal`, `STAFF→teacher`,
  TEACHER/STUDENT/PARENT; `decodeRoleClaim` (`bootstrap/lib/jwt.ts:20-23`) uses it via `appRoleOf()`.
  Engineers wiring a newly-denormalized `authorRole`/`ownerRole` field write a fresh local `switch`
  that returns `null` for ADMIN/MANAGER/STAFF and escalate it as a product question. Effect is a
  silently badge-less row for the MOST common author (BE gates SCHOOL-scope posts to ADMIN only), so
  the "shows a role badge in real mode" AC is unmet. Note `appRoleOf` can return `"admin"`, which is
  usually not in the feature's display union → narrow it. Also a decision-0026 duplication (feed had
  THREE role maps: role-meta, `feed/page.tsx:21-33` for the viewer, the new mapper one).
- **"Harmless today because the app ships `NEXT_PUBLIC_USE_MOCK=true`" is ALWAYS FALSE** (US-E18.31).
  `USE_MOCK = env === "true"` (`bootstrap/lib/mock.ts:9`) → **unset = real**; `next.config.ts:21-24`
  THROWS on a deploy build with mock=true, so production is *required* to run the non-mock branch; and
  the repo's `.env.local` is `NEXT_PUBLIC_USE_MOCK=false` (E18 stories build/verify in real mode). Any
  risk an engineer defers on that premise is live in prod. Concretely for a hybrid real-reads/mock-writes
  repo: `toast.success` on a mock-backed publish = a school announcement the author believes went out.
- **Hybrid (real reads + mock writes) leaks into force-mocked SIBLING features on the same screen**
  (US-E18.31 feed × moderation). Once reads are real, the screen's report/remove actions hand REAL
  content ids to a still-force-mocked feature: `MockModerationRepository.removeContent` returns
  `{ok:true}` when `reportId` is absent (feed's ADR-0052 direct-removal path) → fake takedown; a
  report of real content is silently discarded (safeguarding). Always grep the screen's OTHER
  Server Actions for factories that are still force-mocked before accepting a read-only un-mock.

- **A "no data yet" surface whose ERROR state is an INDEFINITE SKELETON** (US-E18.32
  `stat-row.tsx`: `if (isLoading || !stats) return <Skeletons/>`). Once a header/stat query
  errors terminally (403 `forbidden`, or after the retry budget), `isLoading` is false and the
  data stays `null` forever → a permanently pulsing placeholder that reads as "still loading".
  Especially damning on a story whose whole thesis is "never let unknown look like data". The
  giveaway is a two-branch component fed by a nullable prop plus a *story that asserts the
  absence of numbers* (locking the behaviour in instead of catching it). Ask for a third branch
  (render the cards with the em-dash/unavailable marker, or a compact inline error) and keep the
  skeleton for genuine loading only.
- **E18 un-block story that resolves a numbered cross-repo ask leaves the ask ledger stale** —
  `docs/reports/<date>-fe-to-be-asks.md` keeps the now-CLOSED ask in "Phần 2 — còn treo", and the
  *residual* sub-gap the story could NOT close gets no new numbered ask at all (it lives only in a
  DI doc-comment). Pair this with the standing `docs/TEST_MATRIX.md`-row-still-`planned` check —
  both are cheap pre-close items on every E18 story. (US-E18.32 ask #40(b).)
- **An endpoint constant left behind with a FALSE justifying comment after an un-mock**
  (US-E18.33 `GRADES_EP.childList`): the un-mock comment says "kept only for the mock
  repository's unchanged shape", but `grep -rn "GRADES_EP.childList" src/` returns ZERO hits —
  the mock repo never referenced it. Whenever a story documents why it is KEEPING something,
  grep the identifier; the justification is often invented. Same class as the stale doc-comments
  that assert the opposite of a new contract.
- **"ADR NNNN says this is permanently mocked" is often FOLKLORE** — US-E18.33's packet, DI
  comments, endpoint comments and repo interface all cited "ADR 0054 permanent mock" for the
  parent child-switcher; `grep -i child docs/decisions/0054-*.md` returns NOTHING. Always grep
  the cited ADR for the claim before accepting either "this is pinned by an ADR" or "this story
  reverses an ADR". Affects whether a new ADR is genuinely required at close.
- **Two sibling pickers for the same concept degrading differently** (US-E18.33): timetable's
  child-picker renders `t("classPending")` = "Chưa có lớp" + a "Con thứ N" ordinal, while the
  shared `ChildSwitcher` renders `className: ""` as a BLANK line and a raw uuid as the child's
  name — because its `ChildSummary.name`/`className` are REQUIRED strings so infrastructure has
  no "absent" option. Un-mock stories make these degradations newly reachable. Check the sibling
  surface's fallback copy and require parity (fix belongs in presentation — infra must not
  translate).
- **`initialsOf(name)` is duplicated ~10× repo-wide** (grades, timetable, feed, discipline,
  staff-leave, teacher×2, parent-links, profile). Pre-existing, so CONSIDER-level per story, but
  worth routing to `fe-lead` as a cross-cutting `shared/` extraction.

- **"Anticipatory, contract-correct DTO" written while an endpoint was believed unreachable is
  UNVERIFIED — and the mock fixtures usually hide the error at BOTH ends** (US-E18.34, caught by the
  engineer, worth making a standing check). US-E20.5 declared its `status` field with the DOMAIN enum
  casing (`present|excusedAbsent`) while the wire is UPPER_SNAKE, and the mock fixture generator
  emitted DOMAIN casing too — so DTO → mapper → entity round-tripped green through a type that was
  wrong at both ends; tsc, the mapper test and every story passed. Any un-mock US inheriting a DTO
  that "was already contract-correct" must re-ground-truth EVERY enum/field against the Go source and
  re-cast the mock fixtures to the WIRE vocabulary (so the mock keeps exercising the real mapper).
  Corollary: a mock that speaks domain casing is a mock that no longer tests the mapper.
- **`mapStatusFromWire`-style `Record<Wire,Domain>` lookups have no unknown-value fallback** —
  a 5th BE enum value yields `undefined` typed as the domain enum, which then hits
  `TONE[undefined]`, `t(undefined)` and `counts[undefined] += 1` (NaN). Latent while the BE enum is
  closed + validated; note it as CONSIDER whenever an un-mock newly routes REAL wire data through
  one of these tables.
- **Un-mocking a read un-covers the RSC page's `result.ok ? result.data : []` swallow** (US-E18.35
  `(app)/admin/roster/page.tsx:30`). While the method was force-mocked the failure branch was
  unreachable, so the page never needed an error state and its VM has no `fetchError` field at all.
  The moment the story flips it to real, a 403/404/transport failure renders "this class has no
  students" — a silent false-empty on a roster/PII surface, with the enroll affordances still live.
  Tell: the SIBLING page in the same feature (`principal/students/page.tsx`) already does it right
  (`errorVm(...)` + `ListError` + no retry on `forbidden`), so the asymmetry is the giveaway. On
  EVERY un-mock story, grep the consuming RSC pages for `.ok ? ... : []` / `?? []` and require the
  error state. Blocking.
- **A 2nd "data legitimately absent" em-dash marker invented instead of promoting the 1st**
  (US-E18.35 `MissingValue` vs US-E18.32 `UnavailableValue`): byte-equivalent structure
  (`<span tone><span aria-hidden>—</span><span class="sr-only">{t(...)}</span></span>`) and even the
  same resolved colour (`text-muted-foreground` aliases to `--edu-text-secondary`), differing only in
  the i18n namespace/copy. Decision 0026 case (b) → Revision Required. Fix = one
  `components/shared/absent-value/` taking a pre-translated `label` prop. Cheap grep:
  `grep -rn 'aria-hidden="true">—' src` (a 3rd inline instance lives in
  `components/shared/grade-book-table/grade-book-table.tsx:214,234`).
- **Discriminated `errorKey` union that presentation never branches on** — a VM returns
  `errorKey: "forbidden" | "network-error"`, a unit test proves the distinction, then the screen does
  `throw new Error(result.errorKey)` and renders ONE generic error card with a retry button for both.
  The "forbidden is not collapsed into empty" AC is met, but the discriminant is dead in presentation
  and a 403 gets a retry that can never succeed — even when the domain already exports
  `isRetryableFailure()` saying only `network-error` retries. Check that the union member is actually
  READ, not just produced. (US-E20.4, replicating the US-E20.2 consent-section precedent → cross-cutting,
  route to fe-lead.)
