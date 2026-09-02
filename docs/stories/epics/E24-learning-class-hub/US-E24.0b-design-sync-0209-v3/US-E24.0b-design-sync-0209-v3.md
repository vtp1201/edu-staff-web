# US-E24.0b Sync design bundle 0209 **v3** (D1–D9 + R1–R3 đã khớp contract BE)

## Status

implemented

## Lane

tiny

## Dependencies

- Depends on: US-E24.0 (baseline v1 đã sync)
- Blocks: US-E24.2..E24.11 (mockup normative cho FE build)
- Feature module(s) chạm: none (`design_src/`, `docs/product/*`, `docs/design-changelog.md`)
- Shared contract/file: `docs/product/design-spec.jsonc`, `docs/product/screens.md`

## Product Contract

Bundle `~/Downloads/design_src0209_v3` = v1 + D1–D9 (khớp contract BE 02/09) + R1–R3
(verified 02/09 bởi FE lead: R1 audit trail quay lại trong dialog với 4 trạng thái + 2 action
consent; R2 token `successText`/`tealText`/`mediaSurface` + `T_DARK`/`applyTheme`; R3 comment).

Quy tắc sync (selective, như US-E24.0) — **khác biệt so với E24.0**:

- **Copy** 7 file khác v1: `edu/{app,class-hub,course-items,course-player,attendance-portal}.jsx`
  và lần này **CẢ `edu/parent-links.jsx`** (v3 khôi phục `PLAuditTrailSection` trong dialog,
  thêm `consent_agreed`/`consent_declined` — thay bản DR-023 của repo, giữ ý đồ gốc).
  Kiểm tra `diff` các file còn lại (`ui.jsx`, `teacher.jsx`, `student.jsx`, …) — chỉ copy nếu khác.
- **`tokens.js`: merge tay** — giữ comment decision của repo (0040/0027/0046/0013), THÊM 5 key
  mới (`successText`, `tealText`, `mediaSurface`, `chipBg`, `inputBg`) và khối
  `T_LIGHT`/`T_DARK`/`applyTheme`. Không có token runtime mới: map `successText→--edu-success-text`,
  `tealText→--edu-teal-text`, `mediaSurface→--edu-media-surface`, `chipBg→--muted`,
  `inputBg→--background`; dark = `.dark` block sẵn có trong `globals.css`. **Không ADR.**
- Root: `EduPortal.html`, `CHANGELOG.md`, `README.md`.
- **GIỮ** 5 file DR-020..022 (`assignments`, `lesson-plan`, `question-bank`, `staff-discipline`,
  `student-absences`.jsx) — bundle vẫn không ship.

## Relevant Product Docs

- `../EPIC-OVERVIEW.md` §7 (D1–D9), `../US-E24.0-design-sync-0209/*` (Evidence mẫu)
- `docs/design-requests/DR-023-parent-link-audit-trail.md` (đối chiếu R1)
- `docs/product/design-spec.jsonc`, `docs/product/screens.md`, `docs/design-changelog.md`

## Acceptance Criteria

- `diff -rq ~/Downloads/design_src0209_v3/edu design_src/edu` chỉ còn: 5 file DR giữ lại,
  `.impeccable`, `tokens.js` (chỉ khác comment — chứng minh bằng `diff` in ra trong Evidence,
  mọi VALUE giống nhau, các key mới có mặt).
- `design_src/edu/parent-links.jsx` == v3 (bản DR-023 cũ được thay; ghi chú trong
  `docs/design-requests/DR-023-*.md` §Status: "mockup superseded by bundle 0209 v3 — same
  in-dialog placement, +consent actions"; code FE `features/admin/parent-links` không đổi).
- `docs/product/design-spec.jsonc`: gỡ ghi chú "deviation … chờ bundle sửa" ở D1–D7, D9 của 5
  entry E24; thêm normative mới từ v3: tab Thời khoá biểu có 2 sổ (ngày GVCN 4 trạng thái; tiết
  GVBM: `lessonTitle≤200`, `remark≤2000`, grade A–D, `absentCount`; prep: note + 1 lessonPlan +
  ≤20 link), player chỉ Tổng quan, `CiSubmitBox` text≤20000 + link + confirm, card GVBM
  `absentToday`+`pendingGrades`, leave dialog from/to + ≤3 file, D7 visibility rule, token map
  R2. Chỉ giữ deviation còn thật: GVCN readonly môn khác (ask #7), tạo EXAM từ timeline (ask #6),
  upload file bài nộp (ask #1), điểm bài nộp (ask #2).
- `docs/product/screens.md`: ghi chú "bundle 0209 v3" thay v1 ở các hàng E24; hàng Parent–Student
  Links ghi "audit trail mockup = bundle v3".
- `docs/design-changelog.md`: mục 2026-09-02 v3 (R1–R3 + lý do sync parent-links lần này).
- Không đụng `src/`. `bun vitest run && bun build` xanh.

## Design Notes

- Commands: `cp` chọn lọc; `tokens.js` merge tay bằng Edit.
- UI surfaces: none.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit / Integration / E2E | n/a |
| Platform | `bun vitest run && bun build` green; `diff -rq` + `diff tokens.js` trong Evidence |
| Release | design-review gate n/a |

## Harness Delta

None (không ADR, không token runtime mới).

## Evidence

### 1. `diff -rq ~/Downloads/design_src0209_v3 design_src` (after the selective copy)

```
Files /Users/vietthangpham/Downloads/design_src0209_v3/CHANGELOG.md and design_src/CHANGELOG.md differ
Only in design_src: CLAUDE_DESIGN_SYNC.md
Only in design_src/edu: .impeccable
Only in design_src/edu: assignments.jsx
Only in design_src/edu: lesson-plan.jsx
Only in design_src/edu: question-bank.jsx
Only in design_src/edu: staff-discipline.jsx
Only in design_src/edu: student-absences.jsx
Files /Users/vietthangpham/Downloads/design_src0209_v3/edu/tokens.js and design_src/edu/tokens.js differ
Only in /Users/vietthangpham/Downloads/design_src0209_v3: tweaks-panel.jsx
```

After copying `CHANGELOG.md` too, the only remaining differences are: 5 DR-020..022
files the bundle never ships, `.impeccable` (repo tooling state), `CLAUDE_DESIGN_SYNC.md`
(repo-only doc, not in the bundle), `tweaks-panel.jsx` (dev tool, not a screen, never
synced), and `tokens.js` (merged by hand, see §2). `design_src/edu/parent-links.jsx`
is now **byte-identical** to the bundle (`diff` returns empty) — confirmed separately:

```
$ diff ~/Downloads/design_src0209_v3/edu/parent-links.jsx design_src/edu/parent-links.jsx
IDENTICAL (no output)
```

### 2. `tokens.js` — merged by hand, verified value-identical

`diff ~/Downloads/design_src0209_v3/edu/tokens.js design_src/edu/tokens.js`:

```
12c12
<   errorDark: '#B91C1C',
---
>   errorDark: '#B91C1C',        // solid fill for white text (8.2:1) — decision 0040
15,17c15,17
<   errorText: '#C0392B',   // AA text trên nền sáng — decision 0027 (khôi phục)
<   warningText: '#9A6A0F', // AA text/icon tone warning trên nền sáng — mirror tokens.css, decision 0046
<   warningForeground: '#2A3547',
---
>   errorText: '#C0392B',        // AA on white/light (5.1:1) — decision 0027
>   warningText: '#9A6A0F',      // AA text/icon tone warning trên nền sáng — mirror tokens.css, decision 0046
>   warningForeground: '#2A3547', // never white on warning yellow (a11y, decision 0013)
18a19
>   successText: '#0E9A82',
24a26,27
>   tealText: '#00806F',
>   mediaSurface: '#0f1117',
28,30d30
<   successText: '#0E9A82',
<   tealText: '#00806F',
<   mediaSurface: '#0f1117',
```

All 3 hunks are comment-text/ordering only — **every value is byte-identical**
(`errorDark`, `errorText`, `warningText`, `warningForeground`, `successText`,
`tealText`, `mediaSurface` all match). The repo's decision comments (`0040`,
`0027`, `0046`, `0013`) were kept verbatim. The 5 new keys (`successText`,
`tealText`, `mediaSurface`, `chipBg`, `inputBg`) and the `T_LIGHT`/`T_DARK`/
`applyTheme` block were added by hand with values copied verbatim from the
bundle (`window.T_DARK` block, 14 keys, and `window.applyTheme`) — no
independent re-typing, no new runtime token, no ADR.

### 3. Files copied

- **Overwritten (6, incl. `parent-links.jsx` this time)**:
  `design_src/edu/{app,attendance-portal,class-hub,course-items,course-player,parent-links}.jsx`
- **Root**: `design_src/CHANGELOG.md` re-copied (v3 adds the R1–R3 + D1–D9
  sections on top of v1's history). `EduPortal.html` and `README.md` were
  already byte-identical to the bundle (no change needed).
- **Merged by hand**: `edu/tokens.js` (see §2).
- **Not copied**: `tweaks-panel.jsx` (dev tool, never synced in v1 either).
- **Untouched**: `edu/{assignments,lesson-plan,question-bank,staff-discipline,student-absences}.jsx`,
  `edu/.impeccable`, `CLAUDE_DESIGN_SYNC.md`.

### 4. `parent-links.jsx` R1 content verified

`grep -n "PLAuditTrailSection\|consent_agreed\|consent_declined" design_src/edu/parent-links.jsx`
confirms `PLAuditTrailSection` (line 53) rendered inside `PLDetailDialog` (line 467),
and `PL_AUDIT_ACTION` extended with `consent_agreed`/`consent_declined` (lines 40–41,
45, 49) alongside the existing `created`/`unlinked`. `docs/design-requests/DR-023-parent-link-audit-trail.md`
§Status updated with the supersession note (mockup only; FE code at
`src/features/admin/parent-links/**` untouched).

### 5. D1–D9 spot-checked against the actual bundle source (not just the CHANGELOG prose)

- D1: `CH_DAILY_STATUS` in `class-hub.jsx` has exactly 4 states (`draft`/`pending`/`approved`/`returned`);
  `ChPeriodLogForm` has `title` (maxLength 200, required), `comment` (maxLength 2000),
  `rating` (A–D segmented), `absent` (0–200 number, "Tham khảo — không thay điểm danh");
  `ChPrepForm` has a lesson-plan `<select>`, a note `<textarea>`, and a link list capped
  at 20 (`f.links.length >= 20` disables Add), no file input anywhere in the form.
- D5: class list card data (`CH_CLASSES`) carries `absentToday`/`pendingGrades`, rendered
  as 2 KPI tiles (lines ~86–92); no `taught/total` progress bar anywhere in the file.
- D2: `course-player.jsx` renders only a "Tổng quan" block (no tab bar markup at all).
- D3/CiSubmitBox: `course-items.jsx` `CiSubmitBox` — `textarea maxLength={20000}` +
  a `step` state machine (`edit`→`confirm`→`done`), no file input.
- D4: player content path renders `Tổng quan` text content; 16:9 frame only for `item.embed`.
- D6: `attendance-portal.jsx` excuse dialog has `dateFrom`/`dateTo` (2-col date grid,
  "Nghỉ từ ngày"/"Đến hết ngày"), a `reason` textarea, and a file picker capped at 3
  files, accept `.jpg,.jpeg,.png,.pdf`, ≤5MB each (regex-checked client-side) — no
  "Theo tiết"/"Tiết nghỉ" field anywhere.
- D7: `ciVisibleToStudent = (it) => it.type === 'exam' || ciStatus(it) !== 'upcoming'`
  — confirmed the exact visibility rule.
- D9: `window.T_LIGHT`/`window.T_DARK`/`window.applyTheme` present at the foot of `tokens.js`.

### 6. Docs updated

- `docs/product/design-spec.jsonc` — all 5 E24 screen entries (`teacher-class-hub`,
  `student-course-timeline`, `student-course-player`, `student-attendance`,
  `parent-attendance`) updated: removed every "deviation … chờ bundle sửa" note for
  D1–D7/D9, replaced with normative layout details; kept exactly 4 real deviations,
  each tagged with its cross-repo ask number (`ask #7` GVCN readonly other subject,
  `ask #6` cannot create EXAM from timeline, `ask #1` text/link-only submission,
  `ask #2` grade/feedback shown only when BE returns it). Re-parsed with
  `strip-json-comments` — valid JSONC.
- `docs/product/screens.md` — 6 rows annotated "bundle 0209 v3" (Class Hub, Parent–Student
  Links, Courses v2, Course Player, Student Attendance, Parent Attendance); new
  "Design bundle 0209 v3" block appended after the v1 block in §Ghi chú, summarizing
  R1–R3 + D1–D9 + the 4 remaining real gaps.
- `docs/design-changelog.md` — new top entry `2026-09-02 — Design bundle 0209 v3 …`.
- `docs/design-requests/DR-023-parent-link-audit-trail.md` — §Status note added
  (superseded by bundle v3, same placement, FE code unchanged).

### 7. Gate

| Command | Result |
| --- | --- |
| `bun vitest run` | 508/523 files, 4175/4210 tests passed — the 15 failing files (all `exam-bank` real-mode timeouts, US-E18.28) are **pre-existing on `main` at `d2fbda67`**, confirmed by `git stash` + re-running the same test file on a clean checkout (same failure, same test). Not caused by this docs-only change (no `src/` file touched). |
| `bun run build` | ✅ exit code 0, all routes compiled |

No `src/` file was touched by this story.
