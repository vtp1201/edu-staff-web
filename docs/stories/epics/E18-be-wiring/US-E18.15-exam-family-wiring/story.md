# US-E18.15 LMS exam family wiring — real exam-papers CRUD+status, permanently-blocked class-exam assembly/lifecycle/submissions

## Status

planned

## Lane

normal

(hard-gate check: no auth/RBAC change beyond existing tiered-visibility
pattern already handled throughout the epic; no token/session change; no
tenant-isolation change; no data-loss risk — removing a delete action the
real BE never supported is a disclosed scope cut, not a data-loss risk; no
new PII; no weakening validation; no new design-system token. See
`docs/decisions/0056-exam-family-wiring-contract-scope.md`.)

## Dependencies

- Depends on: US-E18.3 (subject-catalogue — real, provides the `subjectName`
  fan-out join for exam-paper summaries), US-E18.11/US-E18.12 (precedent for
  `ensureFreshSession` DI wiring + hybrid permanently-blocked-method pattern).
- Blocks: none known.
- Feature module(s) chạm: `src/features/exam-bank/**` (domain
  entities/failures/use-cases untouched where possible, infra dtos/mappers/
  repository remapped, presentation gets real-lifecycle status affordance +
  **teacher builder route (create/edit) + delete hidden/blocked in real
  mode — see Amendment below, this is a bigger UI change than originally
  scoped and needs design-review sign-off**), `src/bootstrap/di/exam-bank.di.ts`
  (+ `ensureFreshSession`), `src/bootstrap/endpoint/exam-bank.endpoint.ts`
  (full remap to `/lms/exam-papers`). `src/features/exam/**` (student
  exam-taking) is explicitly OUT OF SCOPE — stays mock, zero change.
- Shared contract/file: `messages/{vi,en}.json` `examBank.*` namespace —
  reuse existing keys, add only genuinely new ones (CONFIDENTIAL status
  label if surfaced, new error codes). Solo mode confirmed via
  `git fetch --prune` (remote has only `origin/main`).

## Product Contract — ground-truthed against `edu-api`

Full analysis in ADR `0056` **+ its 2026-07-17 Amendment — READ THE AMENDMENT
FIRST, it supersedes the write-path table originally drafted below** (the
`openapi.yaml` write-path docs are themselves drifted from the real Go
source; ground-truth is `internal/lms/exambank/adapter/http/{routes.go,
dto/request.go,exam_paper_handler.go}`). Corrected summary (Option A):

### Wireable REAL: `IExamBankRepository` → `/api/v1/lms/exam-papers`

| Operation | Method + path | Actor | Notes |
| --- | --- | --- | --- |
| List papers (role-filtered) | `GET /lms/exam-papers?subjectId&gradeLevel&status&cursor&limit` | ADMIN (all) / TEACHER-author (any status) / TEACHER-other (PUBLISHED only, own subjects) | query key is **`gradeLevel`**, not `grade` |
| Get one (auth-filtered) | `GET /lms/exam-papers/{id}` | DRAFT=author-only(404 else); PUBLISHED=author/assigned-teacher/ADMIN(answerKey-stripped for non-author); CONFIDENTIAL=ADMIN-only(404 else) | |
| Status transition | `PUT /lms/exam-papers/{id}/status` | DRAFT→PUBLISHED (author); PUBLISHED→CONFIDENTIAL (author/ADMIN); terminal | maps to the existing `publishExam` UI action, DRAFT→PUBLISHED only |

### PERMANENTLY BLOCKED STUBS in real mode (hybrid DI, same class as US-E18.5/US-E18.13)

| Operation | Why blocked |
| --- | --- |
| `createExam` | Real `POST /lms/exam-papers` is metadata-only (`{subjectId,gradeLevel,title,durationMinutes}`) — no inline `questions[]`. Real `POST /:id/questions` is add-ONE-question, DRAFT-only, append-only (no full-replace) and has **no options-text array field** — the builder's 4-option MCQ authoring model cannot round-trip. |
| `updateExam` | No update-exam-paper endpoint exists at all. |
| `deleteExam` | No delete-exam-paper endpoint exists at all. |

**Consequence for the teacher exam-builder screen (create + `[id]/edit`
routes)**: since none of create/update/delete are wireable, the entire
builder must be hidden or blocked in real mode (`!USE_MOCK`) — not just the
delete button. This is a **larger UI-behavior change than originally scoped**
and needs explicit design-review sign-off (see Amendment in ADR 0056). The
**admin exam-bank screen is read-only already** (list + get only) so it
becomes 100% real with no UI change beyond the 3-value status badge. The
**teacher exam-bank list + publish action** wire real; the **teacher builder
(create/edit)** stays mock-first permanently and its route should present a
clear "not available" state in real mode rather than a broken/erroring form.

`totalMarks` is server-computed (sum of question `marks`) on the wire — not
relevant to the builder now that create/update are blocked in real mode; the
mock builder path is unaffected.

**Known trap to fix while wiring**: the existing client-side
`validateQuestionsForPublish` (`domain/use-cases/validate-questions.ts`)
requires `options.length >= 2` per question — this will incorrectly fail
`PublishExamUseCase` against REAL exam papers read back from the wire (which
never have an `options` array). Either scope this validation to the mock
path only, or make it tolerant of a missing/empty `options` array when the
question came from a real read (real questions were already validated
server-side at write time, and there is no write path to re-validate here).

### Error taxonomy (ground-truthed `internal/lms/exambank/core/domain/error/exam_paper.go`, UPPER_SNAKE confirmed same as US-E18.7/8/9/11/12/13)

| Failure type | HTTP | Code |
| --- | --- | --- |
| `not-found` | 404 | `EXAM_PAPER_NOT_FOUND`, `EXAM_PAPER_SUBJECT_NOT_FOUND` |
| `forbidden` | 403 | `EXAM_PAPER_FORBIDDEN` |
| `not-draft` (invalid-for-edit) | 409 | `EXAM_STATUS_INVALID_FOR_EDIT` |
| `invalid-transition` | 409 | `EXAM_STATUS_TRANSITION_INVALID` |
| `question-body-required` | 422 | `EXAM_QUESTION_BODY_REQUIRED` |
| `question-marks-invalid` | 422 | `EXAM_QUESTION_MARKS_INVALID` |
| `answer-key-required` | 422 | `EXAM_ANSWER_KEY_REQUIRED_FOR_MCQ` |
| `answer-key-not-allowed` | 422 | `EXAM_ANSWER_KEY_NOT_ALLOWED` |
| `title-required` | 422 | `EXAM_PAPER_TITLE_REQUIRED` |
| `title-too-long` | 422 | `EXAM_PAPER_TITLE_TOO_LONG` |
| `duration-invalid` | 422 | `EXAM_PAPER_DURATION_INVALID` |
| `invalid-cursor` | 400 | `EXAM_PAPER_INVALID_CURSOR` |
| `network-error` | ≥500/transport | — |
| `unknown` | fallback | — |

### STAYS MOCK-FIRST PERMANENTLY (out of scope, per ADR 0056)

- `IExamRepository` (`src/features/exam` — student list/questions/submit/
  result) — force-mocked regardless of `USE_MOCK`. No new repository, no new
  screen. The entire `/lms/class-exams*` family (publish-to-class, admin
  activate/complete/retract, submissions) has no wire integration here:
  no existing "publish exam to class" UI (new-screen boundary), no
  self-scope `classId` resolver for STUDENT (asks #9/#15/#20's premise, 7th
  confirmation), and essay-question submission has zero wire representation
  (`SubmitExamAnswersRequest` is MCQ-only by `position`).

## Design Notes (existing screens only — design-review + a11y gate applies)

No new screen (per ADR 0056's scope cut) — but a **bigger UI-behavior
change than the original "hide delete only" scope**, per the Amendment:
- 3-value status (`DRAFT`/`PUBLISHED`/`CONFIDENTIAL`) — status never
  color-only (icon+label per `accessibility.md`); reuse `StatusBadge`
  pattern, no new token.
- Teacher exam-bank list: "Create" action + the builder routes
  (`teacher/exam-bank/create`, `teacher/exam-bank/[id]/edit`) are
  hidden/blocked in real mode (no wire path for create/update/delete) —
  must not silently 404 or show a broken form; present a clear, translated
  "not available yet" state. Delete action hidden/disabled for the same
  reason — not a bare `disabled` button with no explanation.
  `teacherName` fallback to a raw-id-derived placeholder (documented,
  consistent with prior IAM-name-gap precedent) is acceptable, not a
  blocking a11y/design issue by itself.
- This is UI-behavior scope creep vs the original story framing (an entire
  route becomes unreachable in real mode, not just one button) — flagged
  explicitly for the design-review gate, not silently shipped.

## Cross-repo findings (appended to `EPIC-OVERVIEW.md` §Cross-repo requests as #23–26)

23. **(US-E18.15, 2026-07-17) [confirms #6/#7/#9/#13/#15/#18/#20/#21/#22's
    premise a 10th time]** `ExamPaperResponse` carries only `authorId` (UUID)
    — no author display name. Same recurring IAM-name-lookup gap.
24. **(US-E18.15, 2026-07-17)** `AddQuestionRequest`/`ExamQuestionResponse`
    have no options-text array field — MCQ questions with >1 answer choice
    cannot fully round-trip through the real contract as currently defined.
    Ask: add an `options: string[]` (or similar) field if MCQ-authoring
    parity with the current mock builder is a real product need.
25. **(US-E18.15, 2026-07-17)** `services/core/docs/openapi.yaml`'s
    `ExamBank` write-path documentation (`CreateExamPaperRequest.questions`,
    a `SetExamQuestionsRequest` full-replace endpoint) is drifted from the
    actual Go source/routes — the doc describes a richer contract than what
    is implemented (real: metadata-only create; add-one-question,
    DRAFT-only, append-only). BE-side doc-hygiene ask, not a web blocker
    since the epic playbook ground-truths the Go source directly.
26. **(US-E18.15, 2026-07-17)** No update or delete endpoint exists for exam
    papers at all — if editing a DRAFT paper's metadata or discarding a
    mistaken DRAFT is a real product need, ask BE for `PATCH`/`DELETE`
    restricted to DRAFT + author-only. Separately: no `POST /lms/class-exams`
    UI exists anywhere in the web app — publishing an exam paper to a class,
    admin activate/complete/retract, and the submissions viewer are net-new
    screens with zero prior design/BA work. Route to `/uiux` + `/ba` if this
    becomes a real product priority — not a BE gap, BE already ships the
    full contract (`ExamBank`/`ClassExam`/`ExamSubmission`, US-054/055/062).

## Design Source

No new screen. Existing `exam-bank-screen`/`exam-builder-screen` keep their
layout; only the status badge (3-value) and delete-affordance change.

## Evidence

**Status: engineer-complete, awaiting review/a11y/design-review/QA gates**
(Status left `planned` for fe-lead to finalize per workflow).

Implementation (Option A — ADR 0056 amendment, ground-truthed against the Go
source, NOT `openapi.yaml` which is drifted for the write path):

- **Wired REAL** (`ExamBankRepository`): `listExamBank` (`GET
  /core/api/v1/lms/exam-papers`, cursor-paginated with `raw:true` top-level,
  `status` sent as the UPPER wire value, `subjectName` resolved via a
  `subject-catalogue` fan-out, `teacherName` falls back to `authorId`),
  `getExamDetail` (`GET .../{id}`), `publishExam` (`PUT .../{id}/status`
  `{status:"PUBLISHED"}`, DRAFT→PUBLISHED). Admin exam-bank screen (read-only)
  is now 100% real; teacher list + publish are real.
- **Permanently blocked stubs** (no wire endpoint): `createExam`/`updateExam`/
  `deleteExam` throw `"not-supported"`. Teacher "Create" + delete affordances
  hidden in real mode (`authoringEnabled = USE_MOCK`); teacher builder routes
  (`create`, `[id]/edit`) render an `ExamBuilderUnavailable` explanatory state
  in real mode instead of a form that would fail on submit. Publish stays
  available (it IS wired). A translated note explains the disabled authoring.
- **3-value status** (DRAFT/PUBLISHED/CONFIDENTIAL): entity/DTO/mapper/VM +
  `ExamCard` tone map (draft→warning, published→success, confidential→muted)
  + `StatusBadge` reuse (text label always present → never color-only) +
  filter option. CONFIDENTIAL not surfaced as an action (no UI for it).
- **Error taxonomy**: full 13-code UPPER_SNAKE matrix
  (`map-exam-bank-error.ts`, `errorCodeOf`-based) → `ExamBankFailure` union
  extended with `not-supported`/`invalid-transition`/`not-editable`/
  `question-body-required`/`question-marks-invalid`/`answer-key-required`/
  `answer-key-not-allowed`/`title-required`/`title-too-long`/`duration-invalid`/
  `invalid-cursor`. Real repo maps code→failure key then throws it
  (throwing-repo idiom → domain `mapRepoError`).
- **Validation-trap fix**: `validateQuestion` passes through when `options` is
  absent/empty (real questions have no options model, validated server-side).
- **DI**: `ensureFreshSession()` wired into the real branch of
  `exam-bank.di.ts` (first time — decision 0018 playbook step 6). Hybrid
  factory (real reads/publish + blocked write stubs).
- **i18n**: 11 new `examBank.errors.*` keys + `status.confidential` +
  `authoringDisabledNote` + `unavailable.*` added to both `vi.json` (source)
  and `en.json` (mirror).

Proof (run on this branch):
- `bunx vitest run`: **306 files / 1944 tests pass** (baseline 303/1902 —
  zero regression, +3 files/+42 tests from the mapper/error-map/validate +
  real-repo tests).
- `bunx vitest run --config vitest.storybook.mts src/features/exam-bank`:
  12/13 pass. The 5 `exam-bank-screen` stories that previously failed
  (baseline — screen owns `useRouter`, no App Router mounted) now PASS after
  adding `nextjs: { appDirectory: true }` (baseline improved by +5). The 1
  remaining failure (`ExamBuilderScreen > Builder Validation`) is a
  PRE-EXISTING baseline failure (verified failing on a clean-HEAD `git stash`
  run): `BuilderActionBar`'s publish button uses `aria-disabled` while the
  story asserts native `toBeDisabled()` — untouched by this US, out of scope.
- `bunx tsc --noEmit`: clean.
- `bun lint` (biome, changed surface): clean.
- `bun run build`: green — all exam-bank routes compiled (teacher list/create/
  edit, admin list).

New cross-repo asks (registered in `EPIC-OVERVIEW.md` as #24–26): no
options-text field (MCQ choices unstorable), `openapi.yaml` write-path drift,
no update/edit/remove/delete endpoint.

## Accessibility Audit (WCAG 2.1 AA) — `fe-accessibility-auditor`

### 1. Audit Summary

Scope: diff `55275e1..HEAD` on `feat/us-e18.15-exam-family-wiring` —
`src/features/exam-bank/presentation/**` (3-value status badge, authoring-
disabled note, new `ExamBuilderUnavailable` state) + route-level gating
(`teacher/exam-bank/{page,create/page,[id]/edit/page}.tsx`,
`admin/exam-bank/page.tsx`). Audited from two lenses: keyboard-only
screen-reader user, and WCAG 2.1 AA against the school-device baseline in
`.claude/rules/accessibility.md`.

Criteria checked: 1.3.1 (info/relationships — heading structure), 1.4.1
(color-only status), 1.4.3/1.4.11 (contrast, resolved against `tokens.css`
not eyeballed), 2.1.1/2.1.2 (keyboard operable, no trap), 2.4.3 (focus
order), 2.4.6 (headings/labels), 2.4.7 (focus visible — unchanged, Radix
preserved), 3.3.1/3.3.2 (error/status identification, microcopy), 4.1.2
(name/role/value — Radix semantics intact).

Findings: 0 blocking, 1 should-fix, 2 minor. **Overall: PASS** — the gate is
green; the should-fix (missing page heading on the new blocked-builder
state) should land before/alongside merge since it's a small, mechanical fix
that closes a genuine heading-navigation gap for SR users, but it does not
rise to blocking (the route is still keyboard-reachable, has a clear title/
body/back-CTA via `EmptyState`, and no content is lost — only the heading
landmark is missing).

### 2. WCAG 2.1 AA Coverage

| Criterion | Description | PASS/FAIL | Finding ID |
| --- | --- | --- | --- |
| 1.3.1 Info and Relationships | Blocked-builder route has a discoverable heading for SR heading-navigation | FAIL | A11Y-201 |
| 1.4.1 Use of Color | 3-value status (DRAFT/PUBLISHED/CONFIDENTIAL) not color-only | PASS | — |
| 1.4.3 / 1.4.11 Contrast | `StatusBadge` tones (`warning`/`success`/`muted`) + authoring-note text on `bg-muted` | PASS | — |
| 2.1.1 / 2.1.2 Keyboard | Filter bar (Radix `Select`), card dropdown menu (Radix `DropdownMenu`), builder-unavailable back button all keyboard-operable, no trap | PASS | — |
| 2.4.6 Headings and Labels | `authoringDisabledNote` copy doesn't name all 3 gated actions (create/edit/**delete**) | Minor | A11Y-202 |
| 3.3.1 Error Identification | `not-supported` error copy references "API" (mildly technical) | Minor | A11Y-203 |
| 4.1.2 Name, Role, Value | Icon-only menu trigger `aria-label`, dropdown items removed (not disabled) when unavailable — clear SR experience | PASS | — |

### 3. Findings Catalogue

```
A11Y-201
Severity: Should-fix (WCAG 1.3.1 Info and Relationships, 2.4.6 Headings and Labels)
Component: src/features/exam-bank/presentation/exam-builder-screen/exam-builder-unavailable.tsx
Issue: The mock builder route (exam-builder-screen.tsx) renders a screen-reader-
  only <h1> for page identity:
    <h1 className="sr-only">{t("builder.editTitle"|"createTitle")}</h1>
  ExamBuilderUnavailable — which now REPLACES that entire route's content in
  real mode (!USE_MOCK, both create/page.tsx and [id]/edit/page.tsx) — has no
  heading at all. EmptyState (the shared component it wraps) deliberately
  renders its title as a <p> "so it does not disrupt heading hierarchy" (by
  design, since EmptyState is normally a sub-region inside an already-headed
  page). Here it IS the whole page. A screen-reader user who navigates by
  heading (very common — NVDA/VoiceOver "next heading" is a primary nav
  method) lands on /teacher/exam-bank/create or /teacher/exam-bank/{id}/edit
  in real mode and finds ZERO headings on the page — a regression vs. the
  same route in mock mode.
Evidence:
  exam-builder-screen.tsx:141-143 → <h1 className="sr-only">{...}</h1>
  exam-builder-unavailable.tsx → no <h1>/<h2> anywhere; only EmptyState's <p>.
Fix: Add the same sr-only <h1> pattern used by the sibling mock screen, above
  the EmptyState:
    export function ExamBuilderUnavailable() {
      const t = useTranslations("examBank");
      const router = useRouter();
      return (
        <div className="grid flex-1 place-items-center p-6">
          <h1 className="sr-only">{t("unavailable.title")}</h1>
          <EmptyState
            icon={Lock}
            title={t("unavailable.title")}
            body={t("unavailable.body")}
            cta={{ label: t("unavailable.back"), variant: "secondary",
                   onClick: () => router.push(EXAM_BANK_LIST_PATH) }}
          />
        </div>
      );
    }
  (EmptyState's visible <p> title stays as-is for sighted users; the sr-only
  <h1> gives SR users a heading landmark without visually duplicating text —
  same idiom already used by exam-builder-screen.tsx, no new pattern invented.)
Reference: WCAG 2.1 §1.3.1 (https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html), §2.4.6; ARIA APG heading-navigation practice.

A11Y-202
Severity: Minor (WCAG 2.4.6 Headings and Labels / 3.3.2-adjacent microcopy clarity)
Component: messages/vi.json + messages/en.json → examBank.authoringDisabledNote; src/features/exam-bank/presentation/exam-bank-screen/exam-bank-screen.tsx
Issue: `authoringEnabled=false` gates THREE affordances (create, edit, delete
  — see exam-bank-screen.tsx toCardVM: canEdit/canDelete both AND authoringEnabled).
  The explanatory banner text only names two:
    vi: "Việc tạo và chỉnh sửa đề thi chưa khả dụng..." (create + edit only)
    en: "Creating and editing exams is not available..." (create + edit only)
  A teacher who previously (mock) could delete their own DRAFT paper will see
  the delete item silently vanish from the card's dropdown menu with no
  textual explanation covering that specific action — the banner reads as if
  only create/edit are affected. Not a blocking barrier (the delete option is
  cleanly removed, not left as a broken disabled button), but it under-informs.
Evidence: messages/vi.json examBank.authoringDisabledNote (line ~1723);
  exam-bank-screen.tsx toCardVM: `canDelete: isOwner && exam.status === "draft" && authoringEnabled`.
Fix: Extend the copy to name all three gated actions, e.g.
  vi: "Việc tạo, chỉnh sửa và xoá đề thi chưa khả dụng trong môi trường này. Bạn vẫn có thể xem và publish đề thi hiện có."
  en: "Creating, editing, and deleting exams is not available in this environment. You can still view and publish existing exams."
  (Same key, no new i18n key needed — edit vi.json + en.json in place.)
Reference: WCAG 2.1 §2.4.6 (labels describe purpose); accessibility.md "thông báo lỗi hướng dẫn cách sửa" / clear microcopy rule.

A11Y-203
Severity: Minor (WCAG 3.3.1 Error Identification — clarity for a non-technical, multi-age audience)
Component: messages/vi.json / en.json → examBank.errors.not-supported
Issue: `"not-supported": "Thao tác này không được API hỗ trợ."` names "API" —
  a technical term that leaks an implementation detail to end users (teachers,
  some may be non-technical). This error is reachable if `createExam`/
  `updateExam`/`deleteExam` throw client-side (defense-in-depth, since the UI
  already hides these actions in real mode) — low reachability, but if it DOES
  surface (e.g. a stale tab that still has the builder mounted from before an
  environment flip) the message should stay in plain language, matching the
  rest of the catalogue's non-technical tone (e.g. `not-found`: "Không tìm
  thấy đề thi.").
Evidence: messages/vi.json examBank.errors.not-supported.
Fix: vi: "Thao tác này chưa được hỗ trợ trong môi trường này."
  en: "This action isn't supported in this environment yet." (drop "API").
Reference: WCAG 2.1 §3.3.1; accessibility.md "Microcopy rõ, không viết tắt khó hiểu".
```

### 4. Keyboard Navigation Map

**Teacher exam-bank list** (`/teacher/exam-bank`, real mode, `authoringEnabled=false`):
Tab 1 → skip/nav (layout, unchanged) → Tab → (no "Create" button — `canCreate=false`, correctly absent from tab order, not a disabled ghost button) → Tab → authoring-disabled note (static text, not focusable — correct, it's `role="status"` informational, not interactive) → Tab → filter bar: search input → subject `Select` (Enter/Space opens, Arrow keys move, Esc closes) → status `Select` (same, now offers Draft/Published/Confidential) → teacher `Select` (admin only) → Tab → each `ExamCard`'s menu-trigger `Button` (`aria-label` "Mở menu thao tác đề thi") → Enter/Space opens `DropdownMenu` (Radix: Arrow keys navigate items, Enter/Space activates, Esc closes and returns focus to trigger — unmodified, verified intact) → menu items present are exactly `{Publish}` when `authoringEnabled=false` (Edit/Delete correctly absent, not disabled).

**Blocked builder route** (`/teacher/exam-bank/create` or `/{id}/edit`, real mode): route renders `ExamBuilderUnavailable` only. Tab 1 (after layout chrome) → "Quay lại kho đề thi" button (keyboard-reachable, `type="button"`, standard `Button` component → visible focus ring via `--ring`, unmodified). No trap; Enter/Space activates `router.push` back to the list. **Gap**: no heading to jump to via SR heading-navigation (A11Y-201) — the content itself is still linearly reachable by Tab/read-order, so this is a discoverability gap, not a keyboard trap.

**Admin exam-bank** (`authoringEnabled=false` always): identical to teacher list's blocked state — no Create button, no Edit/Delete menu items ever (admin never owns papers), Publish absent too (`publishAction={forbiddenAction}` — pre-existing, unchanged by this diff).

### 5. Screen Reader Script

**Exam card status badge** — before this US: "Nháp" or "Đã publish" (2-value). After: "Nháp" / "Đã publish" / "Bảo mật" (confidential) — all announced as plain text inside the `Badge` (no `aria-label`-only color swatch), consistent before/after.

**Teacher list, real mode** — after landing: heading "Kho đề thi" (h1) → subtitle → (no Create button announced) → status text "Việc tạo và chỉnh sửa đề thi chưa khả dụng trong môi trường này..." (role="status", announced once on mount by most SR/live-region timing, then reachable by Tab-adjacent reading since it's a `<p>`, not `aria-live` polite-only-announce — it's static content so it's also linearly readable) → filter controls → each card: title, "Mở menu thao tác đề thi" button → menu opens: "Publish" only (no "Chỉnh sửa"/"Xoá" announced, matching that they're genuinely gone, not silently broken).

**Blocked builder route, before fix**: SR user tabs in, hears button "Quay lại kho đề thi" with no preceding heading — if they instead try "next heading" (H key in NVDA/JAWS, VO+Cmd+H in VoiceOver), they get **no result** and may assume the page is still loading or broken (worse than merely inconvenient — it can read as a failure state to a screen-reader user who relies on headings to confirm a page has loaded).

**Blocked builder route, after A11Y-201 fix**: "next heading" lands on sr-only "Không khả dụng" (or "Not available") — confirms page landed, then continues to visible title "Không khả dụng", body text explaining create/edit/delete are unavailable, and the back button.

### 6. Quick Wins (< 30 min each, sorted by severity)

1. **A11Y-201** (should-fix) — add one `<h1 className="sr-only">` line to `exam-builder-unavailable.tsx`. ~5 min.
2. **A11Y-202** (minor) — extend `authoringDisabledNote` string in `vi.json`+`en.json` to name delete alongside create/edit. ~5 min.
3. **A11Y-203** (minor) — reword `errors.not-supported` in `vi.json`+`en.json` to drop "API". ~5 min.

### Gate verdict

**PASS** for design-review gate purposes (0 blocking findings). A11Y-201 is
recommended to land in this same branch before merge (trivial, closes a real
SR heading-navigation gap on a brand-new route state); A11Y-202/203 are
optional polish, safe to defer to a follow-up if the team wants to keep this
branch's diff minimal.

**Fixes applied (fe-lead, same branch, 2026-07-17)**: all 3 findings landed
before merge — A11Y-201 (sr-only `<h1>` added to
`exam-builder-unavailable.tsx`), A11Y-202 (`authoringDisabledNote` reworded
in `vi.json`+`en.json` to name create/edit/**delete**), A11Y-203
(`errors.not-supported` reworded in both files to drop "API"). Re-verified
after fix: `bunx vitest run src/features/exam-bank` 7 files/55 tests pass,
full suite `bunx vitest run` 306 files/1944 tests pass (unchanged — copy-only
+ one heading, no new/removed tests), `tsc --noEmit` clean, `bun lint` clean
(2 pre-existing warnings in unrelated files only).

## Tech-Lead Review — `fe-tech-lead-reviewer`

**Verdict: APPROVED**, no blocking issues (first pass, no revision round).
Independently re-verified against the Go source
(`edu-api/services/core/internal/lms/exambank/**`): all 5 real routes match,
all 13 error codes map 1:1 to `exam_paper.go`'s constructors branched on
`errorCodeOf(err)` (never message), `raw:true` correctly top-level in both
`listExamBank` and the subject-name fan-out (not the US-E18.2/19 nested-raw
bug class), blocked write stubs make no HTTP call (unconditional throw, no
live `if (USE_MOCK)` escape hatch contradicting the "permanently blocked"
claim — the US-E18.12-class self-consistency bug was checked for and not
found here), `ensureFreshSession()` wired correctly, shared `StatusBadge`/
`EmptyState` reused (no fork), tokens-only, i18n vi/en parity. Re-ran
`bunx tsc --noEmit` (clean), `bunx vitest run` (306/1944, matches claim),
`NEXT_PUBLIC_USE_MOCK= bun run build` (green, all exam-bank routes compiled
real-mode) independently. Two non-blocking CONSIDER notes (subject-name
fan-out pages the whole catalogue — fine at current scale, same as
US-E18.4/5 precedent; `teacherName` raw-id fallback — documented, ask #23),
neither required a fix.

## Design Review Gate

This US changes UI behavior more than its original framing (per ADR 0056's
Amendment): the teacher exam-builder route (create/edit) is now blocked in
real mode, not just the delete button. Reviewed against `docs/DESIGN_REVIEW.md`
+ `.claude/rules/impeccable.md` scope (tokens/layout supremacy, a11y/spacing/
state gaps only):
- **Design system conformance**: PASS — no new token, no raw color, reuses
  `StatusBadge` (3-value, text-always-present) and `EmptyState` (blocked
  route) verbatim; no palette/layout reinvention.
- **States**: loading/empty/error/success + the new "unavailable" state all
  covered; blocked route explicitly designed as a first-class state (icon +
  title + body + back-CTA), not a bare error page.
- **A11y**: PASS post-fix (see Accessibility Audit above) — 0 blocking, all
  3 findings fixed and re-verified.
- **Scope-creep disclosure**: the builder-route-blocking (bigger than "hide
  delete only") is documented in ADR 0056's Amendment, the story's Design
  Notes, and this gate explicitly — not silently shipped as a minor tweak.

**Verdict: PASS.**
