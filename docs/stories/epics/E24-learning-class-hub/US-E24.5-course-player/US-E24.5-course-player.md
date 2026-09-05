# US-E24.5 Course Player (kiểu Udemy) — nội dung mục + panel khoá học + nộp bài 1 lần

## Status

planned

## Lane

high-risk

> Lý do: mutation `submitAssignment` (nộp 1 lần, không hoàn tác) + ngoại link (`url`) render từ BE
> → validated allowlist embed, `rel="noopener"`, không `dangerouslySetInnerHTML` cho `content`.

## Dependencies

- Depends on: US-E24.3 (timeline + shared chips), US-E24.1
- Blocks: none
- Feature module(s) chạm: `src/features/lms/presentation/course-player/**` (mới), route
  `student/courses/[courseId]/items/[itemId]/{page.tsx,actions.ts}`, `lms.di.ts` (thêm
  `makeGetMySubmissionUseCase` nếu chưa export)
- Shared contract/file: `messages` namespace `courses.player`; `features/exam` chỉ link tới

## Product Contract

Design v3: `design_src/edu/course-player.jsx` → `CourseItemPlayer`, `CpVideo`, `CpDocument`,
`CpAssignment`, `CpExam`, `CpLocked`; `course-items.jsx` → `CiSubmitBox`; design-spec
`student-course-player`. D2/D3/D4/D7 đã áp dụng trong mockup.

Layout: breadcrumb (course › item) · grid 2 cột (`minmax(0,1.65fr) minmax(280px,1fr)`), mobile 1 cột.
- **Trái**: header (chip loại, tiêu đề, "Loại · khung thời gian", pill trạng thái); banner
  "Đã đóng — chỉ xem để ôn tập." khi CLOSED (trừ assignment/exam có banner riêng); body theo loại;
  bên dưới **chỉ** khối "Tổng quan" (mô tả `description` + khung thời gian) — không tab (D2).
- **Body theo loại**:
  - LESSON: `getLesson` → `content` render **plain text/markdown an toàn** (`text-content.tsx` hiện có,
    không HTML thô). Video 16:9 (`bg-edu-media-surface`) chỉ khi `content`/`url` chứa link nhúng được
    (YouTube/Drive allowlist) — D4. Player thật = `<iframe>` allowlist origin, `title` bắt buộc.
  - DOCUMENT: card link ngoài (`url`, hiển thị hostname), nút "Mở liên kết" (`target=_blank
    rel=noopener noreferrer`), khung "Xem trước" iframe khi allowlist, ngược lại text hướng dẫn.
  - ASSIGNMENT: `getAssignment` + `getMySubmission`. Chưa nộp & OPEN → `CiSubmitBox`: textarea
    `maxLength=20000` + counter, ô "Link bài làm" (URL http(s) validate), nút "Nộp bài" → bước xác
    nhận "Chỉ nộp 1 lần duy nhất" → Server Action `submitAssignment(content)` (content = text +
    "\n" + link nếu có) → "Đã nộp lúc HH:mm · dd/MM/yyyy". Drop-zone tệp render **disabled** với badge
    "Sau khi backend hỗ trợ" (D3, ask #1). Đã nộp → banner success "Đã nộp lúc …" (+ điểm khi có —
    US-141). CLOSED chưa nộp → banner lock + "Bạn chưa nộp bài này trước hạn." (error-text).
  - EXAM: intro (icon, tiêu đề, mô tả), OPEN → "Vào làm bài" → `exam.examUrl` nếu có, else
    `/student/exams/[examId]`; UPCOMING → chip "Mở lúc …"; CLOSED → "Xem lại đề & bài làm" →
    `/student/exams/[examId]` (result).
  - UPCOMING (chỉ EXAM tới được, D7) → `CpLocked`.
- **Phải**: panel "Nội dung khoá học" `idx/total`, nhóm tuần collapsible (button `aria-expanded`),
  mỗi mục: chip nhỏ (lock nếu upcoming), tiêu đề, "Loại · ✓ Đã nộp | Đã đóng | Mở dd/MM", mục
  đang học có `border-l-3 primary` + `aria-current="true"`. Footer Prev / "Mục tiếp theo"
  (disabled ở đầu/cuối). Điều hướng = Link (URL đổi), không state.
- Server Action lỗi map: `already-submitted` (409) → toast + chuyển sang trạng thái đã nộp (refetch);
  `item-closed` (409) → banner closed; `item-not-open` (404) → CpLocked; network → retry.

## Relevant Product Docs

- `docs/product/design-spec.jsonc#student-course-player`
- `docs/reports/2026-09-02-fe-to-be-asks-adr0143.md` #1 #2 #3
- `.claude/CLAUDE.md` §Hard Rules Security; `.claude/rules/accessibility.md`

## Acceptance Criteria

- Route `/student/courses/[courseId]/items/[itemId]` render 4 loại + locked (Storybook 5 story + RSC
  page.test 4 branch: ok / item 404 / course 404 / timeline fail).
- Submit: lần 1 → 200 → UI "Đã nộp lúc …" không cần reload (revalidatePath); lần 2 (race) → 409 →
  toast "Bài này đã được nộp" + UI đã nộp (test action + story `SubmitAlreadySubmitted` tái dùng của
  E24.1 chuyển sang màn mới).
- Counter 20000 hiển thị `n/20000`, chặn nhập quá; nút Nộp disabled khi rỗng cả text và link; link
  không hợp lệ → lỗi field `aria-invalid` + `aria-describedby`.
- Không có `dangerouslySetInnerHTML`; iframe chỉ cho origin allowlist (`youtube.com`, `youtu.be`,
  `drive.google.com`, `docs.google.com`, `geogebra.org`) — unit test `embedSourceFor(url)` trả null
  cho origin khác; link ngoài luôn `rel="noopener noreferrer"`.
- Panel: mục đang xem có `aria-current`; Prev/Next là Link; collapse giữ trong URL? **Không** — local
  state OK (UI-only).
- Mobile 375: 1 cột, panel dưới nội dung; video giữ 16:9.
- i18n `courses.player.*` (vi+en) — mọi chuỗi design đưa vào messages; không hardcode "08:57 / 32:00".
- Gate xanh; design-review + a11y pass (contrast trên `bg-edu-media-surface` dùng
  `text-edu-media-surface-foreground`).

## Design Notes

- Commands: `submitAssignment(assignmentId, content)` Server Action trong `actions.ts` → DI
  `makeSubmitAssignmentUseCase`; trả `{ ok } | { errorKey }`.
- Queries: `getCourse`, `listItems`, + theo loại `getLesson` | `getAssignment`+`getMySubmission`.
- UI: `course-player/{course-player.tsx, player-header.tsx, body-lesson.tsx, body-document.tsx,
  body-assignment.tsx, submit-box.tsx, body-exam.tsx, body-locked.tsx, content-panel.tsx,
  embed-source.ts}`. `submit-box.tsx` = 1 nơi (design `CiSubmitBox` dùng ở 2 chỗ → shared trong
  feature; nếu E24.3 expand tạm còn thì gỡ ở US này).
- Xoá `lesson-player` expand-inline tạm của E24.3 (dòng timeline → Link sang player).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | embed allowlist, submit payload compose, failure→UI state |
| Integration | actions.test (409/404 mapping), page.test RSC |
| E2E | Storybook: submit flow confirm → done; already-submitted |
| Platform | tsc/vitest/build |
| Release | design-review + a11y + security checklist |

## Harness Delta

None (không ADR; upload/grade chờ BE).

## Evidence

(điền sau)

## Implementation Plan

### 0. Corrections vs packet (verified against code post-US-E24.3/E24.1 merge)

- **No new DI factory needed.** `GetAssignmentDetailUseCase` (`domain/use-cases/get-assignment.use-case.ts`)
  already composes `getAssignment` + `getMySubmission` into one `{ assignment, mySubmission }` read and is
  exported as `makeGetAssignmentDetailUseCase` in `lms.di.ts`. Reuse it for the ASSIGNMENT branch — do
  **not** add `makeGetMySubmissionUseCase` (the packet's Dependencies line is stale; DRY beats a second
  factory that does a subset of the same read).
- **EXAM needs zero extra reads.** `CourseItem.exam: CourseItemExam | null` (`examUrl`, `durationMinutes`)
  is already on the `listItems` response consumed for the sidebar — the EXAM body reads it directly, no
  `getExam` call exists or is needed.
- **"Tổng quan" is NOT a BE field for LESSON/ASSIGNMENT/EXAM.** `Lesson`/`Assignment` have no `description`;
  only `CourseItem.description` (DOCUMENT-only) is real data (already rendered in the DOCUMENT body). The
  mockup's `CP_DESC` block is static per-type guidance copy, not fetched data. Overview block = i18n copy
  keyed by `itemType` (`courses.player.overview.<type>`) + the real `startAt`/`dueAt` window (already
  computed by `formatItemWindow`, reused from timeline). Do not invent a description field.
- **`submit-box.tsx` lives ONLY in `course-player/`.** The design shows `CiSubmitBox` twice (timeline expand
  + player), but the timeline's inline expand is the TEMP code this US deletes — after deletion nothing in
  `course-timeline/` submits anything, so there is exactly one caller. No `shared/` promotion needed (would
  violate YAGNI — `component-organization.md` promotes on the *second real* caller, not a caller about to
  be deleted).
- **Reuse `course-timeline.derive.ts`'s `toWeekVms`/`WeekVm` for the sidebar panel.** The panel groups the
  same `CourseItem[]` into the same week buckets the timeline already does — same algorithm, same types.
  Import from `course-timeline/course-timeline.derive.ts`, do not reimplement grouping in `course-player/`.

### 1. Security controls per layer (the hard-gate this lane exists for)

| Risk | Layer | Control |
| --- | --- | --- |
| Arbitrary origin iframe (XSS/clickjacking surface) | **Presentation** (`embed-source.ts`, pure fn, zero React/DOM) | `embedSourceFor(url): string \| null` — parses with `new URL()` (throws → `null`, never renders on a malformed URL); compares **exact hostname** against an allowlist Set (`youtube.com`, `www.youtube.com`, `youtu.be`, `drive.google.com`, `docs.google.com`, `geogebra.org`, `www.geogebra.org`) after lower-casing — **no `.endsWith`/`.includes` suffix or substring match** (blocks `youtube.com.evil.com` as a subdomain trick and `evil.com/youtube.com` as a path trick, since only `url.hostname` is compared, never the full string); requires `url.protocol === 'https:'`. Returns a **rewritten embed URL** (`/watch?v=` → `/embed/`, `youtu.be/X` → `youtube.com/embed/X`, `/file/d/ID/view` → `/file/d/ID/preview`), never the raw input echoed back as `src`. |
| LESSON content may itself contain a link (D4) | **Presentation** (`extract-first-url.ts`, sibling pure fn) | Regex-extracts the first `https://` URL from `Lesson.content` (plain text — never parsed as HTML), pipes it through `embedSourceFor`. Falls through to text-only render on `null` — an empty/broken player is never the *default* fallback per D4, but an *invalid* embed always falls back to text, never to a broken iframe. |
| `<iframe>` itself | **Presentation** (`body-lesson.tsx`, `body-document.tsx`) | `title` attribute is **mandatory** (a11y AC + design-spec `a11y[2]`); `sandbox="allow-scripts allow-same-origin allow-presentation"` (no `allow-top-navigation`, no `allow-popups` beyond what the allowlisted players need) + `referrerPolicy="strict-origin-when-cross-origin"`. Both fixed as literal JSX attributes, never templated from `url` beyond `src`. |
| External link (`item.url`, `item.exam.examUrl`) | **Presentation** (every anchor rendering a BE-sourced URL) | `target="_blank" rel="noopener noreferrer"` — no exception. Matches the existing `ExternalChip` pattern already in `item-detail.tsx` (being deleted, but the pattern is the precedent to keep). |
| LESSON body render | **Presentation** (`body-lesson.tsx` → reuses existing `text-content.tsx`) | Confirmed: `TextContent` already renders `content` as `<p>` per paragraph via `toParagraphs()` — **no `dangerouslySetInnerHTML` anywhere in this component**, confirmed by reading the current file. Plan carries this invariant forward unchanged; `fe-tech-lead-reviewer` greps for `dangerouslySetInnerHTML` across the new `course-player/` folder as a gate item. |
| Submit is irreversible (data loss risk) | **Domain** (`SubmitAssignmentUseCase`, already exists, unchanged) + **Presentation** (`submit-box.tsx`) | Two-step UI: `edit → confirm → done`. The `confirm` step is a **separate render state**, not a native `confirm()` — the confirm banner text ("Chỉ nộp 1 lần duy nhất") is the only thing standing between a click and an irreversible POST, so it must be keyboard-reachable and screen-reader-announced (`role="alertdialog"`-style live region is overkill for one inline banner; a plain `role="status"`/visible text banner is enough since it is not modal). The actual `submitAssignment` call fires **only** from the `confirm` state's "Xác nhận nộp" button — the initial "Nộp bài" button in `edit` state never calls the Server Action directly. |
| Race: double-submit (two tabs, or client state drift) | **Server Action** (`actions.ts`) + **Presentation** | BE is the source of truth (`409 already-submitted`, single-attempt enforced server-side — the client confirm step is UX, not the security boundary). On `already-submitted`: toast + **re-fetch** via `getAssignmentDetailAction` (already exists) to pull the real `mySubmission` and flip `submit-box.tsx` to its `done` render — never a client-invented "submitted" banner with fabricated timestamp. |
| Client-side 20 000-char cap is NOT a security boundary | **Presentation** (`maxLength` + counter) + **Server Action** (no client-trusted bypass) | `<Textarea maxLength={20000}>` blocks keystrokes past the cap (UX only). The Server Action passes `content` straight to `SubmitAssignmentUseCase` unmodified — it does **not** trim/truncate/re-validate length itself (that would silently accept and mutate over-limit input instead of surfacing the BE's real `invalid-content` 422 → `LmsFailure` `"invalid-content"` → existing `courses.errors.invalid-content` i18n key). Confirmed: no client-side length "fix-up" logic is added — the failure path is the validation. |
| Link field validation (`http(s)` only) | **Presentation** (`submit-box.tsx`) | New field (not in `student-assignments`'s existing sheet). Validate `new URL(link)` parses **and** `protocol` is `http:`/`https:` before enabling submit; invalid → `aria-invalid` + `aria-describedby` per AC. Compose payload as `content = text + (link ? "\n" + link : "")` (Design Notes) — BE only accepts one `content` string, there is no separate link field on the wire. |

### 2. Route + component tree

```
src/app/[locale]/t/[tenant]/(app)/student/courses/[courseId]/items/[itemId]/
  page.tsx        — RSC: guard(student) → notFound() on course/item 404, error banner on items-list
                    failure; parallel reads (course, items); branch by active item.itemType/state;
                    binds Server Actions with courseId/itemId already applied (`.bind`, per existing
                    [courseId] page precedent — never an inline closure passed from RSC)
  actions.ts      — 'use server': submitAssignmentAction(assignmentId, content), plus
                    getAssignmentDetailAction / getLessonAction re-exports (courseId-bound) reused
                    for the post-409 re-fetch and the LESSON body read
  page.test.ts    — RSC branch test: ok / item 404 (itemId not in listItems) / course 404 / items-list
                    read failure (error banner, course header still renders — matches [courseId] pattern)
  actions.test.ts — submitAssignmentAction: 200 → Submission; 409 already-submitted → errorKey;
                    409 closed → errorKey; 404 not-found → errorKey; guard forbidden

src/features/lms/presentation/course-player/
  course-player.tsx        — root: breadcrumb, grid (content pane | sidebar), delegates body by itemType
  player-header.tsx        — ItemTypeChip (reused) + title + "<typeLabel> · <window>" + ItemStatePill (reused)
  closed-banner.tsx         — lock icon + "Đã đóng — chỉ xem để ôn tập." (lesson/document only; assignment/
                              exam render their own closed state inline per D-notes)
  body-lesson.tsx           — TextContent (reused) + conditional CpVideo-equivalent iframe via extract-first-url
  body-document.tsx         — link header row + "Mở liên kết" (rel=noopener) + preview iframe (allowlist) or
                              fallback text
  body-assignment.tsx       — instructions + submit-box | closed-banner | submitted-banner (via mySubmission)
  submit-box.tsx            — text + link fields, counter, edit→confirm→done, calls submitAssignmentAction
  body-exam.tsx             — intro block, state-branched CTA (open/closed/upcoming) using item.exam.examUrl
  body-locked.tsx           — reuse-shaped like CpLocked; only reachable for EXAM per D7
  content-panel.tsx         — sidebar: header+counter, week groups (toWeekVms reused), collapsible sections
                              (local useState, per design "không giữ trong URL"), itemRow Link(s), footer
                              Prev/Next as <Link>
  embed-source.ts           — pure: embedSourceFor(url): string | null (allowlist + rewrite)
  extract-first-url.ts      — pure: extractFirstUrl(text): string | null (regex, LESSON-content-only)
  course-player.i-vm.ts     — CoursePlayerVm (active item + sibling list + course meta), no new Server
                              Action types beyond what actions.ts already returns
```

- `overview` block (the former "Tổng quan" tab-turned-static-panel) is a small piece rendered inside
  `course-player.tsx` itself (below the type body), not a separate file — it's ~6 lines of copy + the
  window line, doesn't earn its own component per YAGNI.

### 3. Domain/infrastructure — no new files, confirm-only phase

No new entity/repository/mapper/use-case file. `ILmsRepository`, `GetCourseUseCase`,
`ListCourseItemsUseCase`, `GetLessonUseCase`, `GetAssignmentDetailUseCase`, `SubmitAssignmentUseCase` are
already correct for this screen's needs (verified against `openapi.yaml` shapes in §0). This phase is a
**recorded confirmation**, not code:
- `lms.repository.ts` `submitAssignment`/`getMySubmission` — re-read once at implementation start to catch
  any drift since US-E24.1; if drifted, that's a defect in an already-`implemented` US, escalate to
  `fe-lead`, don't silently patch it inside this plan's scope.

### 4. Phased breakdown

**Phase 1 — Pure security/derive functions (domain-of-truth for the hard-gate, TDD first)**
- Files: `course-player/{embed-source.ts, extract-first-url.ts}` + `__tests__/*.test.ts`
- Test first: `embed-source.test.ts` — table-driven, one case per allowlisted host (with/without `www.`),
  and explicit bypass-attempt cases: `https://youtube.com.evil.com/x` → null, `https://evil.com/youtube.com`
  → null, `http://youtube.com/...` (non-https) → null, `javascript:...` → null, malformed string → null,
  each real allowlisted URL → correct rewritten embed src. `extract-first-url.test.ts` — no-URL text → null,
  text with one allowlisted URL → that URL, text with a non-allowlisted URL → the raw URL (embedSourceFor
  itself rejects it downstream; extraction is not the gate).
- Done when: unit tests green, 100% branch coverage on the allowlist compare (this is the actual security
  boundary — no hand-waving here).

**Phase 2 — Route + RSC composition (read side)**
- Files: `student/courses/[courseId]/items/[itemId]/{page.tsx, actions.ts}` (getLesson/getAssignmentDetail
  re-exports only — no new use-case), `course-player/{course-player.i-vm.ts, course-player.tsx,
  player-header.tsx, closed-banner.tsx, body-document.tsx, body-exam.tsx, body-locked.tsx, content-panel.tsx}`
- Test first: `page.test.ts` (RSC, 4 branches per AC) written before `page.tsx`; Storybook stories for
  `course-player.tsx` (5 states: lesson/document/exam/locked/document-no-preview) written alongside, driven
  by static VM props (no network) — the read side has no async client state, so Storybook interaction here
  is presentational, not flow-testing.
- Done when: page.test.ts green (all 4 branches), Storybook renders all 5 non-assignment states without
  console errors, `bunx tsc --noEmit` clean.

**Phase 3 — Assignment submit flow (the mutation half of the hard-gate)**
- Files: `course-player/{body-assignment.tsx, submit-box.tsx}` (+ update `course-player.tsx` to route
  ASSIGNMENT through `GetAssignmentDetailUseCase`'s composed read), `actions.ts` add
  `submitAssignmentAction`
- Test first: `actions.test.ts` (Server Action, mock `ILmsRepository`) — 200 success, 409 already-submitted,
  409 closed, 404 not-found, guard-forbidden — written before `submitAssignmentAction`. Storybook
  `submit-box.stories.tsx` interaction tests: empty→disabled, type text→enable, click Nộp→confirm banner
  shown, click Xác nhận→done state rendered, "already-submitted" story simulating the 409 race → banner
  flips to done without a page reload (asserted via testing-library, not a real network call).
- Done when: `actions.test.ts` green (all 5 branches), Storybook interaction suite green, manual keyboard
  walk-through of edit→confirm→done recorded in Evidence.

**Phase 4 — Remove US-E24.3 TEMP inline-expand (cleanup, additive-safe)**
- Files touched (delete/edit, exact loci):
  - **Delete** `course-timeline/item-detail.tsx` entirely.
  - `course-timeline/timeline-row.tsx`: remove `expanded`/`onToggleExpand`/`getLesson`/`assignmentsHref`
    props and the `<ItemDetail>` render block (lines ~199-209 today); the open/closed row's `<button
    onClick={() => onToggleExpand(...)}>` (lines ~178-197) becomes `<Link href={itemHref}>` wrapping the
    same `head` content — visible text (title+type+state) already carries the accessible name, no extra
    `aria-label` needed (unlike the player's icon-heavy sidebar rows). `locked` branch (lines ~153-176)
    is unchanged — still non-interactive.
  - `course-timeline/week-section.tsx`: drop `expandedItemId`/`onToggleExpand`/`getLesson`/`assignmentsHref`
    props; add `courseId` (to build each row's `itemHref`).
  - `course-timeline/course-timeline.tsx`: drop `expandedItemId` state + `assignmentsHref` prop from both
    `CourseTimelineProps` and `StudentTimeline`; add `courseId` passthrough for `itemHref` building.
  - `course-timeline/course-timeline.i-vm.ts`: remove `GetLessonResult` type and `getLesson` from
    `CourseTimelineActions` (dead once `ItemDetail` is gone — the player owns its own lesson read now).
  - `student/courses/[courseId]/page.tsx`: drop `assignmentsHref` prop assembly and `getLessonAction.bind`;
    `actions.ts` for `[courseId]`: remove `getLessonAction` export (dead) — `retryListItemsAction` stays
    (unrelated to this cleanup).
  - `messages/{vi,en}.json`: delete `courses.timeline.itemDetail.*` block entirely (only consumer was
    `item-detail.tsx`). Re-check `courses.player.content.*` (`loading`/`loadError`) — these were the
    LESSON-body *client-side lazy fetch* loading state for the TEMP inline expand; the new player fetches
    LESSON content **server-side in `page.tsx`** (no client loading state needed), so these two keys
    likely become dead too — confirm during implementation and remove if genuinely unused (grep before
    deleting; don't guess).
- Test first: update/delete the corresponding tests in `course-timeline/__tests__/*` and
  `[courseId]/actions.test.ts`/`page.test.ts` to match the trimmed props — this phase is refactor-grade
  (no new behavior), so tests are UPDATED not written red-first, but must stay green throughout.
- Done when: `course-timeline` suite green with zero references to `ItemDetail`/`getLesson` in that folder;
  `grep -rn "TEMP (US-E24.3)"` returns nothing under `src/`.

**Phase 5 — Gate + design-review**
- `bun vitest run && bun build`, contrast check on `bg-edu-media-surface` (confirmed token already exists
  in `tokens.css:68-69` — no ADR needed), `/impeccable audit` on the new route, a11y pass (focus order
  edit→confirm→done, `aria-current` on active sidebar row, `aria-expanded`/`aria-controls` on week
  collapse, Prev/Next `disabled`+`aria-disabled`), `grep -rn "dangerouslySetInnerHTML" src/features/lms`
  → empty, `grep -rn 'target="_blank"' course-player/` → every hit paired with `rel="noopener noreferrer"`.

### 5. i18n

New keys under existing `courses` namespace (vi source + en mirror), grouped `courses.player.*`:
- `overview.{lesson,document,assignment,exam}` — static per-type guidance copy (replaces `CP_DESC`)
- `closedBanner` (lesson/document variant text)
- `submit.{answerLabel,answerCounter,linkLabel,linkPlaceholder,linkInvalid,confirmWarning,reviewButton,
  confirmButton,submitButton,submittedAt,alreadySubmittedToast,notSubmittedClosed,emptyContentHint}`
  — note some of these may already exist under `assignments.submit.*` (the `student-assignments` sheet) —
  grep `assignments.submit.*` before adding; reuse the VALUE/wording for consistency but these are a
  different namespace (`courses` vs `assignments`) since they're different screens — do not cross-import
  translations across namespaces, just keep copy consistent by eye.
- `exam.{startButton,reviewButton,opensAtChip}`
- `sidebar.{title,counter,prevButton,nextButton}`
- Reused as-is (no new key): `timeline.itemType.*`, `timeline.window.*`, `timeline.opensAt`,
  `timeline.opensAtUnknown`, `errors.*` (all of `LMS_FAILURE_TYPES` already has an i18n row).
- Remove: `courses.timeline.itemDetail.*` (Phase 4); confirm-then-maybe-remove `courses.player.content.*`.

### 6. fe-component-architect / fe-state-engineer recommendation

**Both, recommended.**
- `fe-component-architect`: the tree is 10 files with real branching (4 item-type bodies + locked +
  closed-banner + submit-box's own 3-state machine), several of which need explicit prop-contract review
  (e.g. does `body-assignment.tsx` receive the composed `AssignmentDetail` or does `course-player.tsx`
  destructure it first — a ViewModel-shape decision worth a dedicated pass rather than improvising during
  TDD).
- `fe-state-engineer`: `submit-box.tsx`'s `edit → confirm → done` local state plus the post-409
  re-fetch-and-flip behavior is meaningfully different from anything else in `lms` so far — E24.2/E24.3
  are pure reads with a one-shot retry; this is a mutation with a race-recovery path and a
  `revalidatePath` interaction with the RSC page. Worth a dedicated review of: is `revalidatePath` even
  necessary given the client already flips local state? (Likely yes, for the case where the student
  navigates away via Prev/Next `<Link>` right after submitting — the RSC would re-fetch `mySubmission`
  fresh via `GetAssignmentDetailUseCase` on that next page load, so `revalidatePath` on the *current*
  path is about back-button/reload correctness, not the immediate UI.) Flag this reasoning to
  `fe-state-engineer` explicitly rather than assuming it during TDD.

### 7. Test plan → Validation matrix (concrete)

| Layer | Proof |
| --- | --- |
| Unit | `embed-source.test.ts` (allowlist + bypass attempts), `extract-first-url.test.ts`, submit-box payload compose (`content = text + "\n" + link`) as a pure function extracted for testability if `submit-box.tsx` grows nontrivial branching |
| Integration | `actions.test.ts` (submitAssignmentAction 200/409×2/404/forbidden), `page.test.ts` (ok/item-404/course-404/items-fail) |
| E2E/Story | `course-player.stories.tsx` (5 states), `submit-box.stories.tsx` interaction (edit→confirm→done, already-submitted race) |
| Platform | `tsc --noEmit`, `vitest run`, `bun build` |
| Release | design-review (`/impeccable`), a11y audit, security checklist (§1 table) signed off in Evidence |

### 8. Open questions (non-blocking, resolve during implementation)

- [OPEN QUESTION] Does `courses.player.content.*` (loading/loadError) become fully dead once LESSON content
  is read server-side in `page.tsx`? Resolve by grep at Phase 4, remove if confirmed unused.
- [OPEN QUESTION] `www.` variants for `drive.google.com`/`docs.google.com`/`youtube.com` — confirmed to
  include in the allowlist Set explicitly (not via suffix match, to keep the compare a strict equality).
  Confirm no other real-world prefix (e.g. `m.youtube.com`) is needed — out of scope unless a demo asset
  needs it.
- [OPEN QUESTION] `body-assignment.tsx`'s closed-but-not-submitted error banner
  ("Bạn chưa nộp bài này trước hạn.") — confirm this uses `text-edu-error-text` per
  `.claude/rules/design-system.md` contrast ADR 0049 (not `text-destructive`).

## State & Data Flow

No TanStack Query, no global store — pure RSC read + Server Action mutation + local
`useReducer` for the submit box, per repo convention. This screen has exactly ONE piece of
client state worth designing: the submit-box lifecycle. Everything else is either URL-driven
(Prev/Next) or RSC-refetched (page reload / `revalidatePath`).

### 1. Submit-box state machine

States: `idle` (no valid input yet) → `ready` (valid text-or-link) → `confirming` →
`submitting` → `submitted` | `error:already-submitted` | `error:network`.

```
idle ──(type valid content)──> ready
ready ──(edit to empty/invalid)──> idle
ready ──(click "Nộp bài")──> confirming
confirming ──(click "Hủy"/Esc)──> ready               // no request fired yet
confirming ──(click "Xác nhận nộp")──> submitting
submitting ──(200 ok)──> submitted                     // terminal, render banner
submitting ──(409 already-submitted)──> error:already-submitted
   error:already-submitted ──(re-fetch resolves)──> submitted   // auto, not user-driven —
      see §4; UI never stays on a raw "already-submitted" toast, it's a transient
      1-frame state that immediately re-renders as `submitted` once the real
      `mySubmission` is fetched
submitting ──(409 item-closed)──> error:closed          // terminal-ish, renders closed-banner,
   no retry button (deadline is real, retry won't help)
submitting ──(network/5xx/other)──> error:network       // renders retry button →
   error:network ──(click "Thử lại")──> submitting       // re-fires same payload, no re-confirm
```

Only ONE transition ever calls `submitAssignmentAction`: `confirming → submitting`
(plus the `error:network` retry re-entering `submitting` with the same already-composed
payload). The initial "Nộp bài" button in `ready` only flips local state to `confirming` —
it never touches the network. This is the actual security/safety boundary for the
one-way mutation (matches Implementation Plan §1 row "Submit is irreversible").

Represent as `useReducer` (not `useState` × N) in `submit-box.tsx` — 5+ named states with
single-direction transitions is exactly the shape a reducer keeps honest (no illegal
state combos like `submitting: true` + `error: '...'` simultaneously, which plain
`useState` booleans invite).

### 2. Who owns the state — local to `submit-box.tsx`, NOT lifted

`submit-box.tsx` owns its reducer locally. Reason: the confirm/submitting/error
transitions are pure UI-in-progress for one component and no sibling needs to react to
`confirming`/`submitting` mid-flight. The one thing that DOES need to reach outside
this component — "the assignment is now submitted" — is handled by **`revalidatePath`
inside the Server Action**, not by lifting reducer state to `course-player.tsx`:

- `player-header.tsx`'s `ItemStatePill` and `content-panel.tsx`'s sidebar row both derive
  their "✓ Đã nộp" label from the **RSC-fetched** `mySubmission`/item list, not from any
  client state. `revalidatePath` on the current route re-runs `page.tsx` server-side,
  which re-derives those props fresh — so on next paint (same navigation, no full reload
  needed for the props Next.js already re-renders) they pick up "submitted" without
  `submit-box.tsx` needing to broadcast anything upward.
- Concretely: `course-player.tsx` passes `mySubmission` down as a prop from the RSC read.
  `submit-box.tsx`'s own `submitted` reducer state controls the **immediate** banner (so
  the student doesn't wait for a round-trip); the **next** RSC render (revalidatePath, or
  navigating away via Prev/Next and back) is what makes `player-header.tsx`/
  `content-panel.tsx` agree. This is an intentional short-lived duplication (client
  reducer says done immediately; server props say done shortly after) — acceptable
  because it never regresses (client never shows "not submitted" after showing
  "submitted"), only a brief window where the sidebar pill hasn't yet caught up if the
  student is staring at both panes simultaneously (edge case, not a correctness bug).
- Do NOT lift the reducer state to `course-player.tsx` "just so the pill updates
  in sync" — that would require passing a setter down through
  `body-assignment.tsx → submit-box.tsx` for a benefit (one frame of pill sync) not worth
  the prop-drilling, when `revalidatePath` already gets there.

### 3. Server Action `submitAssignmentAction` contract

```ts
// actions.ts — 'use server', courseId/itemId pre-bound via .bind per [courseId] precedent
type SubmitAssignmentResult =
  | { ok: true; submission: Submission }                     // 200
  | { ok: false; errorKey: 'already-submitted'; submission: Submission }  // 409, re-fetched
  | { ok: false; errorKey: Exclude<LmsFailure['type'], 'already-submitted'> }  // closed/not-found/invalid-content/forbidden/network
```

- RBAC/ownership: confirm during Phase 3 implementation whether `SubmitAssignmentUseCase`
  itself validates the assignment belongs to `courseId`/`itemId` the student is looking at,
  or whether that's assumed from the bound `assignmentId` param only. Per repo convention
  (decision `0063`, repository-boundary authorization) this check belongs in the
  `authCtx`-threaded repository call, NOT re-implemented ad hoc in `actions.ts` — if
  `SubmitAssignmentUseCase` doesn't already assert ownership, flag to `fe-lead` as a gap
  (same class of issue as the `switchTenantAction` finding in memory
  `reference-nextjs-server-action-error-boundary` — verify the use-case doesn't let a raw
  `ApiError` escape uncaught either; wrap in `toFailure()` mapping to `errorKey`, never a
  raw throw across the action boundary).
- `revalidatePath('/[locale]/t/[tenant]/(app)/student/courses/[courseId]/items/[itemId]', 'page')`
  AND `revalidatePath('.../student/courses/[courseId]', 'page')` — both. The item route's
  own revalidate covers back-button/reload correctness on THIS page (per Implementation
  Plan §6's own reasoning — confirmed correct); the course-level revalidate is needed
  additionally because `content-panel.tsx`'s sidebar (rendered inside the SAME page as a
  child, so already covered) is fine, but the **course timeline page**
  (`student/courses/[courseId]/page.tsx`, a DIFFERENT route the student may navigate back
  to) shows the same item's "✓ Đã nộp" status independently — that route's RSC cache
  needs its own invalidation or it'll show stale "chưa nộp" until its own next natural
  revalidation. Call both paths from the one Server Action.

### 4. 409 race handling (two tabs / stale confirm)

On `already-submitted`, the action does NOT just return the errorKey — it immediately
re-fetches via the same `GetAssignmentDetailUseCase` composed read (already used by
`page.tsx`) to get the REAL `mySubmission` (content, submittedAt) and returns it embedded
in the result (`{ ok: false, errorKey: 'already-submitted', submission }`). Client-side,
`submit-box.tsx`'s reducer treats this branch as: show a transient toast
("Bài này đã được nộp") AND immediately dispatch to `submitted` state using the
**server-returned** `submission`, never the student's in-progress textarea content. This
is the concrete guard against "fabricated timestamp / wrong content" banners called out
in Implementation Plan §1's race row.

### 5. `item-closed` (409, not yet submitted) and `item-not-open` (404)

- `item-closed` on submit attempt → `error:closed` reducer state → `body-assignment.tsx`
  renders the existing closed-banner variant ("Bạn chưa nộp bài này trước hạn.",
  `text-edu-error-text`) instead of the submit form — this can only be reached via the
  race window (item closed between page load and submit click), since `page.tsx` already
  wouldn't render `CiSubmitBox` for an already-CLOSED item on initial load (RSC read
  reflects current state at request time).
- `item-not-open` (UPCOMING, 404-class per Design Notes) is a page-load-time branch, not a
  submit-time one — `page.tsx` renders `body-locked.tsx` and the submit box is never
  mounted, so there is no reducer state for it; it's an RSC branch, not client state.

### 6. Prev/Next sidebar navigation — confirm: URL state, not client state

`content-panel.tsx` footer + item rows are `<Link>` — clicking changes the URL
(`itemId` param) and triggers a full RSC re-render of `page.tsx` with the new active
item. No client state holds "which item is open." The only client state in
`content-panel.tsx` is the **week-group collapse** (`useState<Set<weekId>>`, per Design
Notes "không giữ trong URL" — intentionally local/ephemeral, resets on navigation, that's
correct per AC). Do not be tempted to add a client-side "currently viewing" state to
avoid an RSC round-trip — the design explicitly wants each item to be its own
server-rendered page (breadcrumb, header, body all re-derive from the URL param).

### 7. Optimistic update — NO, explicitly rejected

Do not optimistically flip the UI to "Đã nộp" before `submitAssignmentAction` resolves.
Reason: this mutation is one-way/irreversible and the two realistic failure modes
(`already-submitted` race, network failure) both require the UI to show something
**different from** what an optimistic "submitted" state would have shown — an optimistic
update would need a rollback path for exactly the cases where rolling back is riskiest
(the student thinks they submitted, then sees it "un-submit," a worse UX than a
brief spinner). Instead: `confirming → submitting` renders a disabled button + inline
"Đang nộp…" loading text (no skeleton — this is a single inline control, not page data),
and only flips to `submitted` on a real 200 (or the re-fetched-and-confirmed 409 path in
§4). This is the "loading, not optimistic" choice explicitly invited by Implementation
Plan §1's race-handling reasoning.

### 8. Async state → UI treatment summary

| State | UI |
| --- | --- |
| `idle`/`ready` | Form enabled; Nộp button disabled (idle) / enabled (ready) |
| `confirming` | Inline confirm banner "Chỉ nộp 1 lần duy nhất" + Xác nhận/Hủy buttons; form fields still visible but not editable-and-resubmittable mid-confirm (freeze inputs) |
| `submitting` | Disabled button, "Đang nộp…" inline text, no skeleton (single control) |
| `submitted` | Success banner "Đã nộp lúc HH:mm · dd/MM/yyyy"; form replaced |
| `error:already-submitted` | Transient toast, then auto-resolves to `submitted` using server-returned submission (§4) |
| `error:closed` | Closed banner (`text-edu-error-text`), no retry (deadline real) |
| `error:network` | Inline error text + "Thử lại" button, form content preserved (not cleared) so student doesn't retype |

### 9. Race conditions & resolution

- **Two tabs submit near-simultaneously**: second tab's `submitting → error:already-submitted`
  path resolves via server-returned `submission` (§4) — no client-side guess.
- **Confirm-then-navigate-away before submit resolves**: `submit-box.tsx` unmounts (Prev/Next
  Link swaps the whole page); the in-flight Server Action still completes server-side
  (BE is source of truth) but the promise result is discarded client-side — acceptable
  because `revalidatePath` already fired and the NEXT time the student lands back on this
  item, `page.tsx` reflects the true state from a fresh RSC read regardless of whether the
  original tab was still mounted to see the result.
- **Reload during `submitting`**: page reload triggers a fresh RSC read; if the POST
  completed server-side before reload, `mySubmission` reflects `submitted` immediately
  (correct); if it hadn't, the form re-renders in its initial state and the student can
  resubmit fresh (no stuck "submitting" ghost state, since reducer state doesn't persist
  across reload — this is desired, not a bug).

## Component Architecture

Scanned before proposing anything: `components/ui`, `components/shared`,
`features/lms/presentation/shared/` (`ItemTypeChip`, `ItemStatePill`, `StatusBadge` under
`components/shared/status-badge/`), `features/lms/presentation/course-timeline/`
(`text-content.tsx`, `course-timeline.derive.ts`). No new primitive needed; `bun ui:add`
gap: none identified (Textarea/Button/Badge/Alert already exist — confirm `Textarea` is
added, else flag).

### 1. Component tree (annotated)

```
page.tsx (RSC, container)
└── course-player.tsx ('use client', presentational/dispatcher — see §3)
    ├── player-header.tsx (presentational)
    │   ├── ItemTypeChip            — REUSED from shared/, unchanged
    │   └── ItemStatePill           — REUSED from shared/, unchanged
    ├── (overview block — inline JSX in course-player.tsx, not its own file, per plan §2 YAGNI)
    ├── closed-banner.tsx (presentational) — LESSON/DOCUMENT only
    ├── {body-lesson.tsx | body-document.tsx | body-assignment.tsx | body-exam.tsx |
    │    body-locked.tsx}           — exactly one mounts, chosen by dispatcher (§3)
    │   ├── body-lesson.tsx (presentational)
    │   │   └── TextContent          — REUSED from course-timeline/text-content.tsx (import
    │   │                              path unchanged; file stays put, only its former CALLER
    │   │                              `item-detail.tsx` is deleted in Phase 4)
    │   ├── body-document.tsx (presentational)
    │   ├── body-assignment.tsx (presentational container for submit-box)
    │   │   └── submit-box.tsx ('use client', CONTROLLED + internal reducer — see §4)
    │   ├── body-exam.tsx (presentational)
    │   └── body-locked.tsx (presentational)
    └── content-panel.tsx ('use client', presentational + local UI state)
        ├── ItemTypeChip (small, per row)  — REUSED
        └── ItemStatePill / inline state label (per row) — REUSED pattern
```

`course-player.tsx`, `content-panel.tsx`, `submit-box.tsx` are `'use client'` (interactive:
collapse toggles, reducer, controlled inputs). `player-header.tsx`, `closed-banner.tsx`,
`body-lesson.tsx`, `body-document.tsx`, `body-exam.tsx`, `body-locked.tsx` are **pure
presentational** (no `'use client'` directive needed unless they end up inside a client
subtree, which they do transitively via `course-player.tsx` — Next.js allows plain
presentational components under a client boundary without their own directive; only files
using hooks/interactivity need `'use client'`).

### 2. `course-player.i-vm.ts` — the RSC↔client contract

`page.tsx` (RSC) does ALL data composition: reads `course`, `listItems` (→ `toWeekVms` for
the sidebar, reused from `course-timeline.derive.ts`), and — only for the active item —
`getLesson` or `GetAssignmentDetailUseCase`'s `{ assignment, mySubmission }`. It resolves
Prev/Next hrefs from the flat item list (adjacent siblings in list order) and passes ONE
discriminated-union VM down. Nothing async or DI-shaped crosses into `course-player.tsx`.

```ts
// features/lms/presentation/course-player/course-player.i-vm.ts
import type { CourseItemState, CourseItemType } from "@/features/lms/domain/entities/course-item.entity";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";
import type { CourseTone } from "../tone";
import type { WeekVm } from "../course-timeline/course-timeline.i-vm";

/** One of these five shapes is ALWAYS present — the union IS the itemType
 *  dispatch key (see §3); no sibling optional fields, no nested `| null` soup. */
export type ActiveItemVm =
  | { kind: "lesson"; id: string; title: string; state: CourseItemState;
      startAt: string | null; dueAt: string | null; content: string }
  | { kind: "document"; id: string; title: string; state: CourseItemState;
      startAt: string | null; dueAt: string | null; description: string | null;
      url: string }
  | { kind: "assignment"; id: string; title: string; state: CourseItemState;
      startAt: string | null; dueAt: string | null; instructions: string | null;
      mySubmission: { content: string; submittedAt: string } | null }
  | { kind: "exam"; id: string; title: string; state: CourseItemState;
      startAt: string | null; dueAt: string | null; examUrl: string | null;
      examDurationMinutes: number | null }
  | { kind: "locked"; id: string; title: string; itemType: CourseItemType;
      opensAt: string | null };
  // "locked" only reachable for itemType === "EXAM" + UPCOMING_HIDDEN (D7) —
  // kept as its own union member (not folded into "exam") because its render
  // (CpLocked) and its data shape (no examUrl yet known) are unrelated to the
  // open-exam branch; folding would reintroduce the "nested optional" smell
  // this union exists to avoid.

export interface CoursePlayerVm {
  courseId: string;
  courseName: string;
  tone: CourseTone;
  /** Sidebar data — same shape/algorithm as US-E24.3's timeline. */
  weeks: WeekVm[];
  activeItemId: string;
  activeItem: ActiveItemVm;
  /** Resolved server-side from flat item order; null at either end. */
  prevHref: string | null;
  nextHref: string | null;
  /** Non-fatal: course header still renders; body region shows an error state
   *  instead of a body when the active item's OWN read failed. */
  activeItemErrorKey: LmsFailure["type"] | null;
}

/** Server Action refs — passed as props, never imported by presentation.
 *  Pre-bound to `assignmentId` in `page.tsx` per `[courseId]` precedent. */
export interface CoursePlayerActions {
  submitAssignment: (content: string) => Promise<SubmitAssignmentResult>;
}

export type SubmitAssignmentResult =
  | { ok: true; submission: { content: string; submittedAt: string } }
  | { ok: false; errorKey: "already-submitted";
      submission: { content: string; submittedAt: string } }
  | { ok: false; errorKey: Exclude<LmsFailure["type"], "already-submitted"> };
```

Why `mySubmission`'s shape is inlined (not the full `Submission` entity): `assignmentId`/
`studentUserId` are redundant at this call site (already known from route params/session) —
the VM carries only what the view renders, per ViewModel convention (avoid leaking
full entities the presentation never uses).

### 3. Dispatcher pattern — ONE dispatcher inside `course-player.tsx`, not a separate file

`course-player.tsx` switches on `activeItem.kind` directly (a single `switch` returning the
matching body component), rather than spinning up a separate `<ItemBodyDispatcher>` file.
Reasons: (a) the switch is ~5 lines and only ever called once per render — extracting it
buys no reuse; (b) `course-player.tsx` is ALREADY the container that must also render
`player-header.tsx`/`closed-banner.tsx`/`content-panel.tsx` around the body, so the switch
lives naturally beside that composition; (c) TypeScript narrows `ActiveItemVm` cleanly on
`activeItem.kind` in a `switch`, so each `body-*.tsx` receives its OWN narrow prop type
(e.g. `body-lesson.tsx` never sees `mySubmission`) — no component does its own runtime
`itemType` check. `closed-banner.tsx` renders only inside the `lesson`/`document` cases
(assignment/exam own their closed rendering per Design Notes).

```tsx
// inside course-player.tsx (illustrative, not implementation)
switch (activeItem.kind) {
  case "lesson":     return <BodyLesson item={activeItem} />;
  case "document":   return <BodyDocument item={activeItem} />;
  case "assignment": return <BodyAssignment item={activeItem} submitAssignment={actions.submitAssignment} />;
  case "exam":       return <BodyExam item={activeItem} />;
  case "locked":     return <BodyLocked item={activeItem} />;
}
```

### 4. Prop interfaces — one per new file

```ts
// player-header.tsx
export interface PlayerHeaderProps {
  itemType: CourseItemType;          // "locked" case passes the union's own itemType field
  title: string;
  typeWindowLabel: string;           // pre-formatted "<typeLabel> · <window>" — i18n composed
                                      // in course-player.tsx (RSC-provided window text), not here
  state: CourseItemState;
  examLocked?: boolean;              // forwarded to ItemStatePill, EXAM+UPCOMING_HIDDEN only
}

// closed-banner.tsx
export interface ClosedBannerProps {
  variant: "lesson" | "document";    // selects i18n copy `courses.player.closedBanner.<variant>`
}

// body-lesson.tsx
export interface BodyLessonProps {
  item: Extract<ActiveItemVm, { kind: "lesson" }>;
}
// renders <TextContent content={item.content} /> then, if extractFirstUrl(item.content)
// resolves through embedSourceFor, a 16:9 <iframe> below it (D4) — no separate embed prop,
// derived internally since it's a pure function of `content`.

// body-document.tsx
export interface BodyDocumentProps {
  item: Extract<ActiveItemVm, { kind: "document" }>;
}

// body-assignment.tsx
export interface BodyAssignmentProps {
  item: Extract<ActiveItemVm, { kind: "assignment" }>;
  submitAssignment: (content: string) => Promise<SubmitAssignmentResult>;
}
// Branches BEFORE rendering submit-box: mySubmission != null → submitted-banner (no submit-box
// mounted at all); state === "CLOSED" && mySubmission == null → closed-banner (error-text
// variant, per D-notes "Bạn chưa nộp bài này trước hạn."); else → <SubmitBox .../>.

// submit-box.tsx — props EXACTLY matching the state machine fe-state-engineer chose
// (useReducer is INTERNAL; only the action ref + initial data cross the prop boundary)
export interface SubmitBoxProps {
  assignmentId: string;
  onSubmit: (content: string) => Promise<SubmitAssignmentResult>;
}
// Internal reducer states (not props): idle | ready | confirming | submitting | submitted |
// "error:already-submitted" | "error:closed" | "error:network" — per State & Data Flow §1.
// submit-box.tsx composes `content = text + (link ? "\n" + link : "")` itself; text/link/
// counter/validity are internal useReducer fields, never lifted to props (no sibling needs
// mid-flight state — State & Data Flow §2). On "submitted" or the "already-submitted"
// auto-resolve, it renders its OWN done-banner from either the 200 response's `submission`
// or the 409 response's re-fetched `submission` — never `item.mySubmission` (that prop is
// only the INITIAL server-read value, used to decide whether to mount submit-box at all).

// body-exam.tsx
export interface BodyExamProps {
  item: Extract<ActiveItemVm, { kind: "exam" }>;
}

// body-locked.tsx
export interface BodyLockedProps {
  item: Extract<ActiveItemVm, { kind: "locked" }>;
}

// content-panel.tsx
export interface ContentPanelProps {
  weeks: WeekVm[];                  // REUSED WeekVm/TimelineItemVm shape from course-timeline.i-vm
  courseId: string;                 // to build each row's href
  activeItemId: string;             // drives aria-current + active row styling
  activeItemIndex: number;          // for "idx/total" counter — computed in course-player.tsx
  totalItems: number;
  prevHref: string | null;
  nextHref: string | null;
}
// Internal state: useState<Set<string>>(weekKey) for collapsed weeks — NOT a prop, resets on
// navigation intentionally (State & Data Flow §6). Item rows render ItemTypeChip (locked
// variant when TimelineItemVm.locked) + a text state label reusing the SAME i18n keys
// ItemStatePill already uses (`courses.timeline.itemState.*`) rather than mounting the full
// StatusBadge-based pill at row-icon size — confirm during implementation whether the row's
// small footprint fits ItemStatePill as-is (likely yes, it's already compact) before writing
// a second label renderer; if ItemStatePill fits unmodified, reuse it directly, don't fork.

// embed-source.ts
export interface EmbedSource {
  origin: string;      // the matched allowlist hostname, for any future debug/analytics need
  embedUrl: string;     // rewritten, safe-to-render-as-iframe-src URL
}
export function embedSourceFor(url: string): EmbedSource | null;

// extract-first-url.ts
export function extractFirstUrl(text: string): string | null;
```

### 5. Placement (`component-organization.md` decision `0026`)

| Component | Home | Reason |
| --- | --- | --- |
| `ItemTypeChip`, `ItemStatePill` | `features/lms/presentation/shared/` (unchanged) | Already promoted in E24.3/E24.4 with 2 named consumers; this US is a 3rd — reuse as-is, no fork. |
| `TextContent` | stays in `features/lms/presentation/course-timeline/text-content.tsx` | File is neutral to which screen calls it; only its caller (`item-detail.tsx`) is deleted. Moving the file itself to `shared/` is NOT required by this US (only one folder imports it post-cleanup: `course-player/`) — leave in place, revisit only if a 3rd screen needs it (YAGNI, matches the `submit-box` non-promotion reasoning in Implementation Plan §0). |
| `submit-box.tsx` | `features/lms/presentation/course-player/` (feature-local, NOT `shared/`) | Confirmed single caller after Phase 4 deletes the timeline's TEMP inline expand — promoting now would violate the "promote on the 2nd REAL caller" rule. |
| `course-player.tsx` + all `body-*.tsx`/`player-header.tsx`/`closed-banner.tsx`/`content-panel.tsx`/`embed-source.ts`/`extract-first-url.ts` | `features/lms/presentation/course-player/` (screen-local) | Single-screen composed components; no 2nd consumer exists. |

### 6. State ownership (contract level — hand-off to `fe-state-engineer`, already aligned)

- **Controlled via props**: `activeItem`, `weeks`, `prevHref`/`nextHref`, `activeItemId` —
  all RSC-derived, re-rendered fresh on every navigation (URL-driven, per State & Data Flow
  §6). `course-player.tsx` and `body-*.tsx` hold ZERO client state of their own.
- **Internal UI state**: `content-panel.tsx`'s week-collapse `Set<string>` (ephemeral, resets
  on nav — confirmed matches design intent); `submit-box.tsx`'s `useReducer` lifecycle (§4
  above), scoped locally per State & Data Flow §2 — explicitly NOT lifted to
  `course-player.tsx`. This matches fe-state-engineer's design 1:1; no contract changes
  requested.
- **Server Action ref**: `submitAssignment` flows `page.tsx` → `course-player.tsx` →
  `body-assignment.tsx` → `submit-box.tsx` as a plain prop (bound with `assignmentId` already
  applied before it reaches presentation, per `.bind` convention) — presentation never
  imports `actions.ts` directly.

### 7. Composition & variant strategy

- No compound-component/slot pattern needed here — the tree is a straightforward
  container→presentational fan-out, not a reusable primitive family.
- `submit-box.tsx`'s `edit → confirm → done` UI is three conditionally-rendered JSX blocks
  keyed off the reducer's discriminant, not a `cva` variant (it's flow state, not a style
  variant).
- `ItemTypeChip`/`ItemStatePill` are consumed via their existing props (`itemType`, `state`)
  — no new variant added to either; `player-header.tsx` and each `content-panel.tsx` row
  pass through unchanged.
- No Radix `asChild`/`Slot` need identified — no component here wraps a foreign root element
  that needs polymorphism.
- Extension point flagged, not built: if a 3rd non-course-player screen ever needs
  `embedSourceFor`/`extractFirstUrl`, promote them to `features/lms/presentation/shared/`
  at that point (currently only this screen needs them — stay local).

### 8. Accessibility contract (interactive nodes)

- `content-panel.tsx` week-collapse toggle: `<button aria-expanded={isOpen}
  aria-controls="<weekKey>-items">` on the header; the items container carries
  `id="<weekKey>-items"`.
- `content-panel.tsx` active row: `aria-current="true"` (per AC) plus visible `border-l-3
  primary` — never colour-only.
- `content-panel.tsx` item rows: rendered as `<Link>` with the item title as the accessible
  name (visible text carries it, matching Implementation Plan §4's `timeline-row.tsx`
  precedent) — no redundant `aria-label` needed since `ItemTypeChip` is already
  `aria-hidden`.
- Prev/Next footer: `<Link aria-disabled="true" tabIndex={-1}>` (NOT a real disabled
  `<button>`, since these are navigational links) when at either end — paired with a visible
  disabled visual style, never relying on `aria-disabled` alone for sighted users.
- `body-lesson.tsx`/`body-document.tsx` `<iframe>`: mandatory `title` (descriptive, e.g. lesson
  title text) — never empty/generic.
- External link anchors (`body-document.tsx`'s "Mở liên kết", `body-exam.tsx`'s exam CTA):
  visible text conveys destination/action; `target="_blank" rel="noopener noreferrer"` per
  security table; no bare icon-only external-link buttons.
- `submit-box.tsx`: `<Textarea aria-describedby>` pointing at the counter (`n/20000`) and,
  when present, the field error; invalid link field gets `aria-invalid="true"
  aria-describedby="<id>-error"`. The `confirming` state's warning banner uses `role="status"`
  (non-modal, live-region announced) rather than a native `confirm()` — matches Implementation
  Plan §1's "keyboard-reachable and screen-reader-announced" requirement. "Xác nhận nộp"/"Hủy"
  buttons are real `<button>` elements, tab-reachable in visual order.
- `closed-banner.tsx` / assignment closed-state / `body-locked.tsx`: icon (`Lock`, banner icon)
  is `aria-hidden`; the text ("Đã đóng — chỉ xem để ôn tập.", "Bạn chưa nộp bài này trước
  hạn.") is the sole accessible content — never icon-only.
