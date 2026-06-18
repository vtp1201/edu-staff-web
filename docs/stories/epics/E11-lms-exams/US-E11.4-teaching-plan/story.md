# US-E11.4 Teaching Plan / PPCT (Teacher Compose + Submit, Principal Approve)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E12.3 (subject catalogue), US-E12.5 (timetable — period references), US-E12.10 (class management)
- Blocks: none
- Feature module(s) cham: `src/features/teaching-plan/` (new feature)
- Shared contract/file: `bootstrap/endpoint/teaching-plan.endpoint.ts` (new)

## Product Contract

Giao vien soan ke hoach bai day (PPCT) theo tuan cho tung mon hoc / lop / hoc ky
(`/teacher/teaching-plan`). Hieu truong xem va phe duyet PPCT
(`/principal/teaching-plan`).

**Teacher view — Weekly grid:**
- Selector: mon hoc + lop + hoc ky.
- Grid: hang = tuan (Tuan 1 -> Tuan N), cot = tiet (Tiet 1..N).
- Moi o luoi: nhan vao -> form nhap: tieu de bai day, muc tieu hoc tap, ghi chu.
- Inline edit truc tiep trong o luoi (khong phai modal rieng biet).
- Footer actions: "Luu nhap" (draft) | "Gui phe duyet" (submit for approval).
- Trang thai PPCT hien thi: draft / submitted / approved / rejected.

**Principal view — Review & Approve:**
- Xem tat ca PPCT da duoc submit, loc theo giao vien / mon hoc / lop.
- Inline view cua grid (read-only).
- Action: "Phe duyet" (-> approved) | "Tra lai" (-> rejected, bat buoc nhap ly do).
- Rejected PPCT: giao vien thay ly do tu choi + co the sua lai va gui lai.

**Workflow states:**
- draft -> submitted (giao vien gui)
- submitted -> approved (hieu truong duyet)
- submitted -> rejected (hieu truong tra lai + ly do)
- rejected -> draft (giao vien chinh sua) -> submitted (gui lai)

Mock-first: `core` service PPCT endpoints chua ship (US-051 BE deferred).

## Relevant Product Docs

- `docs/product/screens.md` — Teacher section (teaching-plan — new row), Principal section (teaching-plan review — new row)
- `design_src/edu/teaching-plan.jsx` — TeachingPlanScreen, TeachingPlanReviewScreen (1506)
- Epic overview: `docs/stories/epics/E11-lms-exams/EPIC-OVERVIEW.md`

## Acceptance Criteria

- AC-1 (loading): Skeleton grid khi load ke hoach.
- AC-2 (grid display): Grid hien thi dung so tuan x so tiet; o co noi dung hien tieu de bai day (truncated); o trong hien placeholder "+".
- AC-3 (inline edit): Click o trong / o co noi dung -> form inline hien ra; nhap tieu de + muc tieu + ghi chu; blur hoac "Luu o" -> luu draft.
- AC-4 (selector): Thay doi mon hoc / lop / hoc ky -> grid load lai du lieu cua subject x class x term do.
- AC-5 (submit): "Gui phe duyet" -> trang thai PPCT -> submitted; nut "Gui" bien thanh disabled; thong bao gui thanh cong.
- AC-6 (principal — view): Hieu truong thay grid day du voi noi dung (read-only); filter theo giao vien / mon hoc / lop hoat dong.
- AC-7 (principal — approve): "Phe duyet" -> confirm -> trang thai -> approved; giao vien nhan thong bao (mock-first).
- AC-8 (principal — reject): "Tra lai" -> dialog nhap ly do (bat buoc >= 10 ky tu) -> trang thai -> rejected; giao vien nhan ly do tu choi.
- AC-9 (teacher — after rejection): Giao vien thay banner "Da bi tra lai: [ly do]"; co the chinh sua o luoi va gui lai.
- AC-10 (empty state): Chua co noi dung ke hoach -> empty state trong grid voi CTA.
- AC-11 (a11y): Grid cells co proper aria-labels; form inline co label; WCAG AA; keyboard navigable between cells.
- AC-12 (i18n): Tat ca strings qua namespace `teachingPlan`.

## Design Notes

- Routes: `/teacher/teaching-plan` (teacher), `/principal/teaching-plan` (principal review)
- Design file: `design_src/edu/teaching-plan.jsx` — TeachingPlanScreen, TeachingPlanGrid, PlanReviewScreen
- Commands: `savePlanCell`, `submitTeachingPlan`, `approveTeachingPlan`, `rejectTeachingPlan`
- Queries: `getTeachingPlan` (subject x class x term), `getPendingTeachingPlans` (principal)
- API (mock-first — core service planned, US-051):
  - `GET  /core/api/v1/teaching-plans?subjectId=&classId=&term=`
  - `PUT  /core/api/v1/teaching-plans/:id/cells` (batch upsert)
  - `POST /core/api/v1/teaching-plans/:id/submit`
  - `POST /core/api/v1/teaching-plans/:id/approve`
  - `POST /core/api/v1/teaching-plans/:id/reject`
- Domain rules: Grid dimensions: tuan x tiet determined by academic calendar term. Submit requires at least 50% of cells filled [ASSUMPTION]. Reject reason min 10 chars.
- UI surfaces: TeachingPlanGrid (inline editable); SubjectClassTermSelector; PlanStatusBadge; ApproveDialog; RejectDialog; PrincipalReviewList

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | submitTeachingPlan (ok/empty-plan/not-draft); approveTeachingPlan (ok/not-submitted); rejectTeachingPlan (ok/missing-reason) |
| Integration | TeachingPlanRepository mock (get, upsert-cells, submit, approve, reject) |
| E2E | Storybook: TeacherGrid_Loading / TeacherGrid_WithContent / InlineEdit_Flow / SubmitFlow / PrincipalReview_Populated / ApproveFlow / RejectFlow / RejectedBannerTeacherView |
| Platform | bun build + tsc clean |
| Release | design-review gate pass |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E11.4 (planned)
- `docs/product/screens.md`: add Teacher "Teaching Plan" + Principal "Teaching Plan review" rows -> design-ready
