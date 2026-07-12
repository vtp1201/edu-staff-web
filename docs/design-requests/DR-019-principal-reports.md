# DR-019 — Principal Reports Dashboard

- **US**: US-E03.1 (first use of epic E03 — `screens.md` reserves "Principal
  / Admin (E03, E09, E10, E11, E12...)" but E03 had no assigned US yet; this
  is the school-wide reporting screen already listed in `screens.md` row
  "Reports | `(app)/principal/reports` | — | `features/principal` | ⬜")
- **Route(s)**: `(app)/principal/reports`
- **Mockup**: `design_src/edu/reports.jsx` — `ReportsScreen`
- **Type**: **RECONCILE** — mockup already exists in the merged v2.2 baseline
  (part of the "states.jsx bộ bắt buộc" adoption wave, confirmed in P8:
  "reports.jsx — đạt spec"). No redesign.
- **Already-implemented check**: `screens.md` already has a placeholder row
  for Reports (⬜, no design file, no US) — this DR fills that gap. No
  `features/principal/reports` code exists in `src/` yet → net-new for `/fe`.

## Scope

Principal-only school-wide reports screen:
- Toolbar: term select (Học kỳ I / II / Cả năm).
- Subject average bar chart (8 subjects, score 0–10 scale).
- Attendance trend line/bar (weekly %, 6 weeks shown).
- Report list table: name, term, generation date, status (`ready` /
  `generating`), download/view action.
- Uses the shared state-primitive pattern explicitly (see file header
  comment in `reports.jsx`): skeleton on load, **first refresh simulates an
  error** (demo `failedOnce` pattern) to exercise `EduError` + retry, empty
  when a filter yields no reports.

## States (4 required — confirmed present, is the reference implementation
of the `failedOnce` retry-demo pattern that P8 asked `invitations.jsx` to
copy)

Loading (`EduSkeleton`), error+retry (`EduError`, `failedOnce` demo), empty
(filtered-to-nothing), success (charts + table populated).

## Design-spec entry

`docs/product/design-spec.jsonc` → `screens.reports` (toolbar, chart
dimensions/scale, table columns) — added by `uiux-designer`.

## UX copy (i18n keys)

Namespace: `reports` (net-new — no existing `reports`/`principalReports` key
in `messages/vi.json`).

```jsonc
// vi.json → "reports"
{
  "reports": {
    "toolbar": {
      "termGroupAriaLabel": "Kỳ báo cáo",
      "termSemester1": "Học kỳ I",
      "termSemester2": "Học kỳ II",
      "termFullYear": "Cả năm",
      "refresh": "Làm mới",
      "exportExcel": "Xuất Excel"
    },
    "stats": {
      "totalStudents": "Tổng số học sinh",
      "schoolAverage": "Điểm TB toàn trường",
      "attendanceRate": "Tỷ lệ chuyên cần",
      "incidentsThisTerm": "Vi phạm trong kỳ",
      "vsLastTerm": "so với HK trước"
    },
    "charts": {
      "subjectAverageTitle": "Điểm trung bình theo môn",
      "subjectAverageScale": "Thang điểm 10",
      "subjectAverageAriaLabel": "Biểu đồ cột điểm trung bình theo môn",
      "attendanceTitle": "Chuyên cần 6 tuần gần nhất",
      "attendanceAriaLabel": "Biểu đồ chuyên cần theo tuần"
    },
    "table": {
      "title": "Báo cáo định kỳ",
      "newReport": "Tạo báo cáo",
      "columnReport": "Tên báo cáo",
      "columnTerm": "Kỳ",
      "columnCreated": "Ngày tạo",
      "columnStatus": "Trạng thái",
      "statusReady": "Sẵn sàng",
      "statusGenerating": "Đang tạo…",
      "download": "Tải về"
    },
    "empty": {
      "title": "Không có báo cáo nào",
      "description": "Chưa có báo cáo nào cho kỳ đã chọn. Thử chọn kỳ khác hoặc tạo báo cáo mới."
    },
    "error": {
      "title": "Không tải được báo cáo",
      "description": "Máy chủ báo cáo không phản hồi. Vui lòng thử lại."
    }
  }
}
```

```jsonc
// en.json → "reports" (mirror)
{
  "reports": {
    "toolbar": {
      "termGroupAriaLabel": "Reporting term",
      "termSemester1": "Semester I",
      "termSemester2": "Semester II",
      "termFullYear": "Full year",
      "refresh": "Refresh",
      "exportExcel": "Export Excel"
    },
    "stats": {
      "totalStudents": "Total students",
      "schoolAverage": "School grade average",
      "attendanceRate": "Attendance rate",
      "incidentsThisTerm": "Incidents this term",
      "vsLastTerm": "vs last term"
    },
    "charts": {
      "subjectAverageTitle": "Grade average by subject",
      "subjectAverageScale": "Scale of 10",
      "subjectAverageAriaLabel": "Bar chart of grade average by subject",
      "attendanceTitle": "Attendance, last 6 weeks",
      "attendanceAriaLabel": "Weekly attendance chart"
    },
    "table": {
      "title": "Periodic reports",
      "newReport": "New report",
      "columnReport": "Report",
      "columnTerm": "Term",
      "columnCreated": "Created",
      "columnStatus": "Status",
      "statusReady": "Ready",
      "statusGenerating": "Generating…",
      "download": "Download"
    },
    "empty": {
      "title": "No reports yet",
      "description": "No reports for the selected term yet. Try another term or create a new report."
    },
    "error": {
      "title": "Failed to load reports",
      "description": "The reporting service did not respond. Please try again."
    }
  }
}
```

Notes:
- Subject names (Toán, Ngữ văn, …), week labels (T1…T6) and per-report titles
  (`"Báo cáo sơ kết Học kỳ I"`, …) are mock/seed data shaped as `{vi, en}`
  pairs in `RP_SUBJECT_AVG`/`RP_ATTENDANCE`/`RP_REPORTS` — excluded from
  i18n; `/fe` renders them from real API data, not from the message catalogue.
- `reports.empty.*` is staged defensively per the DR's state checklist (empty
  when a filter yields no reports) even though the current mock always has
  ≥1 report per term — no mockup markup to transcribe verbatim, so this pair
  follows the same tone/shape as the sibling `EduEmpty` usages elsewhere in
  this batch (e.g. `invitations.empty.none`).

## A11y (WCAG 2.1 AA)

- Charts: values also available as text (table below or `aria-label`
  summary) — not color/bar-only.
- Status (ready/generating) not color-only — icon + label.
- Term select: proper `<label>`.

## BE contract

Not explicitly mapped in `PROMPTS-group-b-ui-gen.md` (reports predate the
group-B prompt pack). `/ba` to confirm which `core`/`lms` aggregation
endpoints back this screen, or flag mock-first if none exist yet.

## Dependencies

None blocking within this batch.

## Status

- [ ] delivered
