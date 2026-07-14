# DR-020 — Student Assignments (Bài tập được giao)

Status: delivered (2026-07-14)
US: US-E11.7 (new — next available under Epic E11 LMS; not yet under `docs/stories/epics/E11-lms-exams/`)
Route: `/student/assignments` (list) — no detail sub-route in scope (submission happens inline via a submit sheet/dialog, see Layout 2)
Roles: `student` only
Design file to create: `design_src/edu/assignments.jsx`

---

## Already-implemented check (done before authoring)

Grepped `src/features/lms/`, `src/features/student/`, `src/app/**/student/` for
"assignment": **NOT implemented**. Only hit is `student.jsx`/`student-dashboard.tsx`
which references a generic `stats.assignments` count stat (dashboard widget only,
no list screen, no detail). `docs/product/screens.md` row 109 already lists this
as `⬜ (E11)`. `docs/product/design-spec.jsonc` already has a **skeletal**
`lms.assignments` entry (route + filters array + card daysLeft badge mapping,
~13 lines, lines 1212-1224) — this is a placeholder stub from an earlier pass,
NOT a full per-screen spec. Verdict: **genuine net-new authoring**, not reconcile.
The designer MUST extend (not replace) the existing skeletal `assignments` key
under `lms` in `design-spec.jsonc` rather than duplicate it elsewhere.

No existing i18n namespace for assignments — `uiux-ux-writer` authors a NEW
`assignments` namespace from scratch (nothing to reuse/extend here, unlike prior
reconcile DRs).

---

## Reused patterns (design system already defines these — do NOT reinvent)

- **Assignment status → badge color** (`.claude/rules/design-system.md` §Status
  mappings, already normative): `pending ≤1d → error`, `pending ≤3d → warning`,
  `pending >3d → success`; `submitted → primary`; `graded → success`.
- **Badge component**: padding 3px 10px, radius full, 11px/600, `bg = color/15`
  (canonical per US-E07.4 — NOT `/18`).
- **States**: reuse `design_src/edu/states.jsx` primitives — `EduSkeleton` (loading),
  `EduEmpty` (empty per filter tab), `EduError` (fetch failure + retry).
- **Filter tabs**: same tab-bar pattern as `design_src/edu/exam.jsx` (ExamListScreen)
  and `design_src/edu/gradebook.jsx` — pill tabs, active = `bg-primary/12` + `text-primary` + `fw700`.
- **Card list pattern**: same vertical list-card shape as `design_src/edu/exam-bank.jsx`
  list view — icon box 44×44 radius 10 (per skeletal spec), title + meta line +
  action row.
- **Course color accents**: `design_src/edu/app.jsx`/`student.jsx` — each course
  has an accent color (dot/left-bar) consistent with `studentHome.courseProgress.colorDot`.
- **Score/GPA color**: reuse `score ≥ 8 → success`, `score < 5 → error`, else
  `text-primary` (design-system §Score/performance màu) for the graded-feedback state.

No new token is anticipated — all colors/patterns above exist in `tokens.css` +
`design-system.md`. If the designer finds a genuine gap (e.g. an "overdue" tint
not covered by existing `error/40` border), flag it to `uiux-lead` for an ADR
BEFORE using a raw color — do not invent inline.

---

## Mục tiêu màn hình

Học sinh xem danh sách bài tập được giao (theo môn/lớp), theo dõi deadline và
trạng thái (`chưa nộp` / `đã nộp` / `đã chấm`), nộp bài (text answer + tệp đính
kèm, mock-first), và xem điểm + nhận xét của giáo viên khi đã chấm.

---

## Layout 1 — Danh sách bài tập (Assignments list)

**Page header**: title "Bài tập" + subtitle đếm số bài đang chờ nộp.

**Filter tabs** (per skeletal spec, already fixed): `Tất cả` | `Chưa nộp` | `Đã nộp` | `Đã chấm`.
Optional secondary filter: theo môn học (dropdown/chip row) — nice-to-have, not
required for MVP scope; wireframe-designer to confirm during IA pass.

**Assignment card** (vertical list, one per assignment):
```
┌──────────────────────────────────────────────────────────────┐
│ [icon 44×44, course color] Bài tập: Giải phương trình bậc 2   │
│                             Toán · Lớp 10A1 · GV: Nguyễn Văn A│
│                             Hạn nộp: 20/07/2026 (còn 3 ngày)  │
│                             [Còn 3 ngày] badge (warning)      │
│                             [Xem chi tiết / Nộp bài]          │
└──────────────────────────────────────────────────────────────┘
```
- Days-left badge uses the fixed mapping above (error ≤1d / warning ≤3d / success >3d).
- **Overdue** (past deadline, still not submitted): card border `error/40` tint
  (per skeletal spec `overdue.borderColor`) + badge text "Quá hạn" (error).
- **Submitted** card: badge `primary` "Đã nộp" + submitted timestamp, CTA becomes
  "Xem bài đã nộp" (secondary).
- **Graded** card: badge `success` "Đã chấm" + score chip (color per GPA/score
  mapping) + CTA "Xem điểm & nhận xét".

**Empty state per tab**: `EduEmpty` — "Chưa nộp" tab empty → "Không có bài tập
nào cần nộp 🎉"; "Đã nộp"/"Đã chấm" tab empty → "Chưa có bài nộp nào".

---

## Layout 2 — Nộp bài (Submit sheet/dialog)

Triggered from card CTA "Nộp bài" — a side sheet or modal (reuse the Sheet
pattern already used across the repo, e.g. `staffing-assignments-screen` sheets,
`classops.jsx` sheet pattern):

- Assignment title + description (read-only, from teacher).
- Đính kèm tệp: file-picker (mock — no real upload backend yet, see BE note below).
- Textarea "Nội dung bài làm" (optional, tùy loại bài tập).
- Actions: "Lưu nháp" (secondary) + "Nộp bài" (primary, confirm dialog if
  overdue: "Bạn đang nộp trễ hạn, tiếp tục?").
- Post-submit: card flips to "Đã nộp" state, toast xác nhận.

## Layout 3 — Xem điểm & nhận xét (Graded feedback — inline expand or same sheet)

- Score chip (color per score mapping) + max score (e.g. "8.5/10").
- Giáo viên nhận xét (text block, muted background card).
- Nếu có tệp GV chấm kèm (annotated file) → download link.
- "Đã nộp lúc" + "Đã chấm lúc" timestamps.

---

## States (mandatory — reuse `states.jsx`)

- **Loading**: `EduSkeleton` — 3-4 skeleton cards matching the assignment-card shape.
- **Empty** (per active filter tab): see above.
- **Error** (fetch failure): `EduError` with retry action.
- **Submitting**: submit button shows spinner + disabled; error inline if submit
  fails (e.g. file too large — mock validation message).

---

## Responsive notes

- 375px: card stacks full-width, meta line wraps to 2 lines, badge moves under
  title (not inline).
- 768px: 1-column list retained (assignments are inherently list-first, unlike
  courses grid) — filter tabs scroll horizontally if they overflow.

---

## BE-aware note (mock-first, decision `0014`)

`lms` service exists conceptually (courses/lessons already mock-first per
`src/features/lms/infrastructure/repositories/mocks/lms.fixtures.ts`) but has
**no real assignment endpoint** yet. Design the submit flow as **mock-first**:
local state transition (pending → submitted) with a simulated async delay;
`/ba` + `/fe` will wire the real repository when `lms` assignment endpoints land.
File upload is UI-only (accept + preview filename), no real storage integration.

---

## Tham chiếu màn hình tương tự

- `design_src/edu/exam.jsx` — ExamListScreen (filter tabs, card list, status badges).
- `design_src/edu/exam-bank.jsx` — list-card icon-box + meta-line + action-row shape.
- `design_src/edu/gradebook.jsx` — score/GPA color chip pattern.
- `design_src/edu/states.jsx` — EduSkeleton / EduEmpty / EduError primitives.
- `src/features/lms/presentation/student-courses/` — existing implemented
  student-facing LMS screen for component/spacing consistency (already built,
  read for conventions, do NOT copy code — this is a design artifact, not app code).

---

## Output cần từ designer + ux-writer

- `design_src/edu/assignments.jsx` — component `StudentAssignmentsScreen`
  (list + filter tabs + submit sheet + graded feedback view), tokens-only, WCAG AA.
- Extend (not replace) `docs/product/design-spec.jsonc` → `lms.assignments` key
  with full normative layout (card anatomy, sheet anatomy, states, a11y, responsive).
- New i18n namespace `assignments` in `messages/{vi,en}.json` (vi source + en
  mirror) — filters, card copy, empty states, submit sheet, graded feedback,
  confirm dialogs, a11y labels.

---

## Dependencies / claim notes

- No in-flight branch touches `lms.assignments` in `design-spec.jsonc` or an
  `assignments` i18n namespace as of 2026-07-14 (checked via `git fetch --prune`
  + branch list — only DR-020's own branch `docs/dr-020-student-assignments`).
- No new design-system token anticipated (see "Reused patterns" above).

---

## Delivery checklist

- [x] `design_src/edu/assignments.jsx` created
- [x] `docs/product/design-spec.jsonc` `lms.assignments` extended
- [x] `assignments` i18n keys added to `vi.json` + `en.json`
- [x] `docs/product/screens.md` row 109 updated (⬜ → 🎨 design-ready)
- [x] `docs/design-requests/README.md` Active Requests row added + marked delivered
- [x] Design-review gate (`/impeccable` audit + critique) passed
- [x] Harness story `US-E11.7` registered via `harness-cli story add`
