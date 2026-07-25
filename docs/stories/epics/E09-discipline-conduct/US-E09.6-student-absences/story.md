# US-E09.6 Student Absences (Teacher / Principal)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none identified
- Blocks: none
- Feature module(s) chạm: `src/features/student-absences/` (new feature)
- Shared contract/file: `bootstrap/endpoint/student-absence.endpoint.ts` (new);
  no shared file collision with the sibling `US-E09.5` staff-discipline
  feature (independent i18n namespace, independent failure union, independent
  domain shape — verified zero code/key reuse in `integration.md` §1)

## Product Contract

Giao vien chu nhiem (GVCN) ghi nhan va chinh sua nghi hoc theo tung ngay (co
phep / khong phep) cho hoc sinh lop minh phu trach. Hieu truong (principal —
vai tro system role cua app nay, tuong ung BE `ADMIN`+`MANAGER` conduct-domain,
KHONG phai vai tro `admin` route-guard rieng cua app, theo ADR `0062`) xem
toan truong / loc theo lop va gan co (flag) mot ban ghi da RECORDED thanh
FLAGGED_UNEXCUSED — mot chieu, khong the hoan tac.

Day la mien 2-trang-thai mot chieu (`RECORDED` -> `FLAGGED_UNEXCUSED`), KHONG
phai workflow duyet DRAFT/SUBMITTED/APPROVED/REJECTED dung boi US-E09.5. Mot
component (`StudentAbsencesScreen`), role-conditional, phuc vu 2 route theo
ADR `0062`: `(app)/teacher/absences` (giao vien: ghi nhan + sua, chi lop minh)
va `(app)/principal/absences` (hieu truong: xem toan truong/loc lop + gan co,
khong ghi nhan/sua). Route `(app)/admin/absences` cua ban nhap DR-022 goc DA
BI BO theo ADR `0062`.

Hai badge doc lap, khong bao gio gop lam mot: excused/unexcused (boolean, giao
vien sua duoc) va flagged (chi hien khi state=FLAGGED_UNEXCUSED, hieu truong
dat). Mock-first (quyet dinh `0014`): 4 endpoint `core` deu THAT va da ship
(ground-truthed qua Go source) nhung khong the goi dau-cuoi hom nay vi
`studentMemberId`/`classId` la UUID that ma web chua co duong resolve
(khoang trong roster-UUID, ask #9/#15/#22) — chon roster gia lap
(`SA_STUDENT_ROSTER`), KHONG live search.

## Relevant Product Docs

- `docs/product/screens.md` — Student Absences row (route `/teacher/absences`,
  `/principal/absences`)
- `docs/product/design-spec.jsonc` → `screens.studentAbsences` (line ~10403)
- `design_src/edu/student-absences.jsx` — `StudentAbsencesScreen`,
  `SAExcusedBadge`, `SAFlaggedIndicator`, `SAFlagConfirmDialog`, `SADateField`
- `docs/design-requests/DR-022-staff-conduct-absences.md` (Screen B)
- `docs/decisions/0062-staff-discipline-absences-route-actor-fix.md` (route
  correction — authoritative over DR-022's original `/admin/absences` alias)
- This packet: `requirements.md`, `integration.md`, `use-cases.md`, `spec.md`
  (consolidated engineering-ready spec, §9 traceability matrix)

## Acceptance Criteria

Condensed checklist — full Given/When/Then AC set lives in `use-cases.md`
§4 (`spec.md` §3/§7 map each FR/UC to its AC group).

- AC-1 (teacher list, loading/empty/error) — 4-row skeleton while INT-002 in
  flight; empty state WITH "Ghi nhận nghỉ học" CTA (teacher variant); error+
  retry re-issues same filter (UC-001, AC-001.1–.6).
- AC-2 (principal list, loading/empty/error) — same skeleton; empty state
  STATIC, NO CTA (distinct from teacher variant); class-filter dropdown
  scopes list+stats; "Gắn cờ" visible ONLY on `RECORDED` rows, zero
  record/edit affordance anywhere (UC-002, AC-002.1–.5).
- AC-3 (teacher records absence) — form: mock-roster-only student select,
  date `max=today`, excused toggle, reason textarea (≤5000). Future-date and
  duplicate-date rejected BOTH client-side (inline error before request) AND
  server-side (identical error rendered from `ABSENCE_INVALID_DATE`/
  `ABSENCE_DUPLICATE_DATE`); network error preserves field values (UC-003,
  AC-003.1–.10).
- AC-4 (teacher edits absence) — ONLY `reason`/`excused` editable via PATCH
  (independently optional, partial body); `date`/`classId`/`studentMemberId`
  render as STATIC TEXT, never as any editable control (UC-004, AC-004.1–.6).
- AC-5 (principal flags absence) — confirm dialog (`role=dialog`,
  `aria-modal`, focus-trapped, states action is irreversible) is the ONLY
  path to trigger the transition; NO optimistic state flip before server 2xx;
  after success "Gắn cờ" no longer offered on that row; Cancel/Escape returns
  focus to the trigger (UC-005, AC-005.1–.10).
- AC-6 (security — server-side re-check, non-negotiable) — teacher
  class-ownership re-check on record/edit AND principal-tier re-check on
  flag, BOTH independent of the client route/role gate, BOTH testable by
  directly invoking the repository/use-case with a forged classId/role, not
  merely by confirming the UI hides the affordance (UC-006, AC-006.1–.5).
- AC-7 (two independent badges + no-unflag) — excused/unexcused badge always
  present; flagged indicator present ONLY when
  `state===FLAGGED_UNEXCUSED`, visually/semantically distinct, never merged;
  NO unflag control exists anywhere, in any role's view, at any time (UC-007,
  AC-007.1–.6).
- AC-8 (responsive) — no horizontal overflow/clipped controls at 320/375/
  768/1280px; `contentPadding` 20px 16px mobile vs 28px 32px desktop; no
  bespoke stacked-card breakpoint required (UC-008, AC-008.1–.4).
- AC-9 (i18n) — all copy in `studentAbsences` namespace (vi source, en
  mirror; keys already present per DR-022's `uiux-ux-writer` pass) — zero
  hardcoded strings, `tsc --noEmit` catches typo'd keys.

## Design Notes

- Routes: `(app)/teacher/absences` (teacher/GVCN), `(app)/principal/absences`
  (principal) — per ADR `0062`; `(app)/admin/absences` alias explicitly
  DROPPED, do not implement it.
- Design file: `design_src/edu/student-absences.jsx` — `StudentAbsencesScreen`
  (single, role-conditional component, mirrors `discipline.jsx`'s proven
  one-component-multi-role-route pattern)
- Commands: `recordAbsence`, `editAbsence`, `flagAbsence`
- Queries: `listAbsences` (own-class for teacher, schoolwide/class-filtered
  for principal)
- API (mock-first — `core` conduct sub-domain, real+shipped BE but
  roster-blocked for web, decision `0014`):
  - `POST /core/api/v1/conduct/student-absences` (record, teacher/GVCN only)
  - `GET  /core/api/v1/conduct/student-absences?classId=&from=&to=` (list,
    role-scoped)
  - `PATCH /core/api/v1/conduct/student-absences/:date?classId=&studentMemberId=`
    (edit reason/excused only, teacher/GVCN own class)
  - `POST /core/api/v1/conduct/student-absences/:date/flag?classId=&studentMemberId=`
    (flag, principal only, one-way RECORDED→FLAGGED_UNEXCUSED)
- Domain rules:
  - Natural key `classId+studentMemberId+date` — immutable once created,
    never sent as editable PATCH body fields.
  - 2-state one-way domain: `RECORDED` → `FLAGGED_UNEXCUSED` (terminal, no
    reverse transition, NOT the shared `ApprovalTransition` shape).
  - Two independent signals per row: `excused` (boolean, teacher-editable)
    and `state`-derived `flagged` (principal-set) — never conflated.
  - Future-date rejected (`ABSENCE_INVALID_DATE`); duplicate natural key
    rejected (`ABSENCE_DUPLICATE_DATE`).
  - Server-side re-check: teacher classId ownership (record/edit), principal
    role tier (flag) — independent of client route/role gate (NFR-008).
- UI surfaces: role-conditional list (teacher own-class / principal
  schoolwide+class-filter), record form/dialog, edit form/dialog,
  `SAFlagConfirmDialog` (irreversible, focus-trapped), `SAExcusedBadge`,
  `SAFlaggedIndicator`, `SADateField`, 3-up summary stats row (total/
  unexcused/flagged), skeleton (rows, count=4), 2 role-scoped empty variants,
  error+retry.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E09.6 --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | record/edit/list/flag use-cases (ok + all documented failure branches per `spec.md` §9); bare-`YYYY-MM-DD` date validation + future-date rejection; client-side duplicate-key pre-check logic |
| Integration | `IStudentAbsenceRepository` mock (record/list/edit/flag CRUD + all 7 `ABSENCE_*` error simulations) — MUST include explicit tests for the forbidden-class (teacher) and non-principal-flag rejections, invoked directly against the repository/use-case, not only via UI-hidden-affordance checks |
| E2E | Storybook: TeacherList_Loading/Empty/Error/Success, PrincipalList_Loading/Empty/Error/Success, RecordDialog_FutureDate/DuplicateDate/Success, EditDialog_ImmutableFields/Success, FlagConfirmDialog_NoOptimisticUpdate/Success/Forbidden, TwoBadges_AllCombinations, Responsive (320/375/768/1280) |
| Platform | `bun build` + `tsc --noEmit` clean |
| Release | design-review gate pass (tokens/a11y/states) AND explicit confirmation the server-side class-ownership + principal-only-flag re-check tests exist and pass |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E09.6 (planned)
- New feature folder: `src/features/student-absences/`
- New endpoint file: `bootstrap/endpoint/student-absence.endpoint.ts`
- No `docs/product/screens.md`/`design-spec.jsonc` edits needed beyond what
  DR-022 + ADR `0062` already delivered (routes already corrected there)
