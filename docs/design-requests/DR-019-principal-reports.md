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

<!-- UX-WRITER: insert reports.* key block here -->

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
