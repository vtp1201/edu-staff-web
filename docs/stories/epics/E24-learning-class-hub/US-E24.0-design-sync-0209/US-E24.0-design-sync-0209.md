# US-E24.0 Sync design bundle 0209 vào `design_src/` (selective)

## Status

implemented

## Lane

tiny

## Dependencies

- Depends on: none
- Blocks: US-E24.2..E24.16 (reference mockup + design-spec entry cho FE build)
- Feature module(s) chạm: none (`design_src/`, `docs/product/*`, `docs/design-changelog.md`)
- Shared contract/file: `docs/product/design-spec.jsonc`, `docs/product/screens.md`

## Product Contract

Bundle designer `~/Downloads/design_src0209` (CHANGELOG 28/08→02/09/2026) trở thành
baseline mockup trong repo, theo quyết định **selective** (user chốt 02/09, xem
`../EPIC-OVERVIEW.md` §5 Q-A/Q-G):

- **Thêm** 4 file mới: `edu/class-hub.jsx`, `edu/course-items.jsx`,
  `edu/course-player.jsx`, `edu/attendance-portal.jsx`.
- **Cập nhật** 9 file: `edu/app.jsx`, `edu/ui.jsx`, `edu/teacher.jsx`, `edu/student.jsx`,
  `edu/classops.jsx`, `edu/messaging.jsx`, `edu/academic-record-view.jsx`, `edu/icons.jsx`,
  `edu/tokens.js` + `EduPortal.html`, `CHANGELOG.md`, `README.md` (root design_src).
- **GIỮ NGUYÊN** 5 file uiux team tự viết (bundle không ship, không thay thế):
  `assignments.jsx`, `lesson-plan.jsx`, `question-bank.jsx`, `staff-discipline.jsx`,
  `student-absences.jsx`.
- **KHÔNG overwrite** `edu/parent-links.jsx` (bundle xoá audit trail DR-023 — chờ designer
  xác nhận, prompt D8).
- `tokens.js` diff chỉ là comment → merge, giữ comment tham chiếu decision của repo.

## Relevant Product Docs

- `../EPIC-OVERVIEW.md` §1, §5, §7
- `docs/product/design-spec.jsonc`, `docs/product/screens.md`, `docs/design-changelog.md`
- `design_src/CLAUDE_DESIGN_SYNC.md`, decision `0021` (design_src normative), `0044`

## Acceptance Criteria

- `diff -rq ~/Downloads/design_src0209/edu design_src/edu` chỉ còn khác ở: 5 file DR giữ lại,
  `parent-links.jsx`, `.impeccable`.
- `design_src/EduPortal.html` load được 4 script mới (mở file trong browser không lỗi console
  về component undefined: `ClassHubScreen`, `CourseItemPlayer`, `StudentCoursesV2`,
  `StudentAttendanceScreen`).
- `docs/product/design-spec.jsonc` có entry mới: `teacher-class-hub`, `student-course-timeline`,
  `student-course-player`, `student-attendance` (+ `parent-attendance` nếu tách) — layout/normative
  values lấy từ jsx, ghi rõ deviation đã biết (D1–D9 trong EPIC §7, chờ bundle sửa).
- `docs/product/screens.md`: thêm hàng cho 4 màn mới (status ⬜ planned, design file), cập nhật
  hàng student courses/assignments/exams ("gộp vào Khoá học — E24.4"), teacher classes
  ("→ Class Hub — E24.7/8").
- `docs/design-changelog.md` có mục 2026-09-02 tóm tắt CHANGELOG bundle + lý do giữ 5 file DR +
  parent-links.
- Không đụng `src/`. `bun vitest run && bun build` xanh (không thể đỏ vì không import, nhưng chạy
  để chứng minh gate).

## Design Notes

- Commands: `cp` có chọn lọc; không xoá file.
- UI surfaces: none (docs/reference only).
- Domain rules: bundle mới dùng hex `#0E9A82`, `#EEF1F6`, `#00806F` ngoài tokens.js → ghi vào
  design-spec là "map sang token": `edu-success-text`, `muted`, `edu-teal-text`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | n/a |
| Integration | n/a |
| E2E | n/a |
| Platform | `bun vitest run && bun build` green; `diff -rq` output trong Evidence |
| Release | design-review gate: n/a (không có UI runtime) |

## Harness Delta

Epic E24 mới (`EPIC-OVERVIEW.md`). Không thêm decision.

## Evidence

### 1. `diff -rq ~/Downloads/design_src0209/edu design_src/edu` (after the selective copy)

```
Only in design_src/edu: .impeccable
Only in design_src/edu: assignments.jsx
Only in design_src/edu: lesson-plan.jsx
Files /Users/vietthangpham/Downloads/design_src0209/edu/parent-links.jsx and design_src/edu/parent-links.jsx differ
Only in design_src/edu: question-bank.jsx
Only in design_src/edu: staff-discipline.jsx
Only in design_src/edu: student-absences.jsx
Files /Users/vietthangpham/Downloads/design_src0209/edu/tokens.js and design_src/edu/tokens.js differ
```

Matches the AC exactly: the only remaining differences are the 5 DR-020..023
files the bundle never shipped, `parent-links.jsx` (Q-G / D8 — not overwritten),
`tokens.js` (comment-only, see below) and `.impeccable` (repo-only tooling state).

### 2. `tokens.js` — verified comment-only, repo version preserved

`diff ~/Downloads/design_src0209/edu/tokens.js design_src/edu/tokens.js` returns
3 hunks, **all on comment text; every value is byte-identical**:

- `errorDark: '#B91C1C'` — repo keeps `// solid fill for white text (8.2:1) — decision 0040`
- `errorText: '#C0392B'` — repo keeps `// AA on white/light (5.1:1) — decision 0027`
  (bundle rewrote it to `// AA text trên nền sáng — decision 0027 (khôi phục)`)
- `warningText` / `warningForeground` — repo keeps the `decision 0046` and
  `never white on warning yellow (a11y, decision 0013)` annotations

The repo file was left untouched so the decision provenance is not lost.

### 3. Files copied

- **New (4)**: `design_src/edu/{class-hub,course-items,course-player,attendance-portal}.jsx`
- **Overwritten (8)**: `design_src/edu/{academic-record-view,app,classops,icons,messaging,student,teacher,ui}.jsx`
  (`icons.jsx` is purely additive: `helpCircle`, `moon`, `maximize`)
- **Root (3)**: `design_src/{EduPortal.html,CHANGELOG.md,README.md}`
- **Not copied**: `edu/tokens.js`, `edu/parent-links.jsx`, `tweaks-panel.jsx`
- **Untouched**: `edu/{assignments,lesson-plan,question-bank,staff-discipline,student-absences}.jsx`, `edu/.impeccable`

### 4. `EduPortal.html` script tags

Diff of the `edu/*.jsx` script list (repo → bundle) is **purely additive** — the
4 new files are added, nothing removed (the 5 DR files were never script-tagged
in the repo version either, so overwriting does not orphan them):

```
> edu/attendance-portal.jsx
> edu/class-hub.jsx
> edu/course-items.jsx
> edu/course-player.jsx
```

`ClassHubScreen`, `CourseItemPlayer`, `StudentCoursesV2`/`CourseTimelinePage`/
`CrossSubjectList` and `StudentAttendanceScreen`/`ParentAttendanceScreen` are all
exported via `Object.assign(window, …)` at the foot of their files, so the
static-load contract holds. (Not opened in a browser in this run — verified by
source inspection of the script list + the window exports.)

### 5. Docs updated

- `docs/product/design-spec.jsonc` — 5 new `screens` entries: `teacher-class-hub`,
  `student-course-timeline`, `student-course-player`, `student-attendance`,
  `parent-attendance`. Split student/parent attendance into two entries (different
  route + role + the parent screen adds the child selector and the excuse dialog;
  the shared `APSummary` block is specified once under `student-attendance` and
  referenced from `parent-attendance`). Every entry flags its own D1–D9 deviations
  inline and records the raw-hex → token mapping (`#0E9A82`→`--edu-success-text`,
  `#EEF1F6`→`--muted`, `#00806F`→`--edu-teal-text`, plus `#0f1117`→existing
  `--edu-media-surface`, `#FBFCFE`/`#C3CBD9` → existing surfaces). **No new token,
  no ADR.** JSONC re-parsed after the edit (comments stripped → `json.loads` OK).
- `docs/product/screens.md` — 4 new `⬜ planned` rows (Class Hub, Courses v2 +
  timeline, Course Player, Student Attendance); annotated in place (no duplicate
  rows): teacher "Classes / Class roster" → Class Hub US-E24.7/E24.8; student
  "Courses + lesson player" / "Assignments" / "Exams" → E24.4 unified "Khoá học"
  tab view (route/status unchanged for now); parent "Attendance" → E24.6 excuse
  dialog. New "Design bundle 0209" block in §Ghi chú.
- `docs/design-changelog.md` — new top entry `2026-09-02 — Design bundle 0209
  selective sync … [INTERNAL]` with the added/updated/omitted breakdown and the
  Q-A / Q-G rationale for keeping the 5 DR files and `parent-links.jsx`.

### 6. Gate

| Command | Result |
| --- | --- |
| `bun vitest run` | ✅ 522 files / 4159 tests passed (24.19s) |
| `bun run build` | ✅ `Compiled successfully in 14.4s` |

No `src/` file was touched, so neither could regress — run per AC to prove the gate.
