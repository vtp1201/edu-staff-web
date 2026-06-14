# US-E14.4 Grade Approval Pipeline (Admin Approves Batches)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E14.2 (grade entry — source of PENDING_APPROVAL batches), US-E12.11 (admin settings — gradePublishMode must be ADMIN_APPROVAL)
- Blocks: US-E14.5 (academic record viewer — approved+locked grades only)
- Feature module(s) cham: `src/features/grades/` (shared with E14.2)
- Shared contract/file: `bootstrap/endpoint/grades.endpoint.ts`; GradeApprovalBatchEntity

## Product Contract

Admin (BGH) xem va xu ly cac lo diem dang cho phe duyet (PENDING_APPROVAL),
chuyen trang thai PUBLISHED, va khoa diem (LOCKED) khi can.
Route: `/admin/grades/approval`.

**State machine cho lo diem (batch per class-subject-term):**
PENDING_APPROVAL -> PUBLISHED (admin approve)
PUBLISHED -> LOCKED (admin bulk-lock)
LOCKED: immutable (chi hieu truong/admin 2 nguoi moi unseal duoc — xem E14.6)

**Danh sach batch:**
- Filter: Tat ca / Cho duyet / Da cong bo / Da khoa.
- Moi batch: lop, mon hoc, giao vien, hoc ky, so hoc sinh, trang thai badge, ngay cap nhat.
- Bulk-lock action: chon nhieu batch PUBLISHED -> "Khoa diem" -> confirm -> tat ca -> LOCKED.

**Per-batch review (expand row hoac SideSheet):**
- Preview bang diem mini (hoc sinh x cot diem) — read-only.
- So lenh: so hoc sinh, diem TB lop, phan bo xep loai (5 band).
- Action: "Phe duyet & Cong bo" (PENDING_APPROVAL -> PUBLISHED) | "Yeu cau chinh sua" (gui lai cho giao vien, truoc khi approve).

**Publish confirmation dialog:**
"Sau khi cong bo, hoc sinh va phu huynh co the xem diem. Tiep tuc?"

RBAC: Chi admin (BGH). Teacher, student, parent khong co quyen vao man hinh nay.
gradePublishMode = ADMIN_APPROVAL (tu /core/api/v1/config/school/operational-settings — REAL endpoint).
Mock-first: core grade approval endpoints chua ship (US-060 BE planned).

## Relevant Product Docs

- `docs/product/screens.md` — Admin section (grade-approval — new row)
- `design_src/edu/grade-approval.jsx` — GradeApprovalScreen (1506)
- US-E12.11 (admin settings — gradePublishMode toggle)
- US-E14.2 (grade entry — origin of PENDING_APPROVAL state)

## Acceptance Criteria

- AC-1 (loading): Skeleton table khi load danh sach batch.
- AC-2 (list): Bang hien thi batch: lop, mon hoc, giao vien, hoc ky, so hs, trang thai badge (PENDING_APPROVAL=warning, PUBLISHED=success, LOCKED=error-muted).
- AC-3 (filter): Pills filter hoat dong chinh xac; "Cho duyet" chi hien PENDING_APPROVAL batches.
- AC-4 (per-batch review): Click batch -> SideSheet/expand hien preview bang diem mini + thong ke + nut action.
- AC-5 (approve): "Phe duyet & Cong bo" -> confirm dialog -> OK -> trang thai -> PUBLISHED; giao vien + hoc sinh nhan thong bao (mock-first noti); toast "Da cong bo diem [mon hoc] [lop]".
- AC-6 (request revision): "Yeu cau chinh sua" -> dialog nhap ghi chu (bat buoc) -> batch tra lai giao vien (trang thai -> DRAFT); giao vien nhan thong bao.
- AC-7 (bulk lock): Chon nhieu PUBLISHED batches -> "Khoa diem" -> confirm "Sau khi khoa, diem khong the chinh sua" -> LOCKED; checkbox batch selection.
- AC-8 (gradePublishMode check): Neu gradePublishMode = SELF_PUBLISH -> man hinh thong bao "Truong dang dung che do tu dong cong bo; approval queue trong."
- AC-9 (empty state): Khong co batch cho duyet -> empty state "Khong co lo diem nao dang cho phe duyet".
- AC-10 (RBAC): Chi admin; teacher -> redirect.
- AC-11 (a11y): Checkbox bulk-select co aria-label; confirm dialog trap focus; WCAG AA.
- AC-12 (i18n): Tat ca strings qua namespace `gradeApproval`.

## Design Notes

- Route: `/admin/grades/approval`
- Design file: `design_src/edu/grade-approval.jsx` — GradeApprovalScreen, BatchCard, BatchReviewSheet, ApproveDialog, BulkLockDialog
- Commands: `approveGradeBatch`, `requestGradeRevision`, `bulkLockBatches`
- Queries: `getGradeApprovalBatches` (filter by status), `getBatchDetail`
- API (mock-first — core planned US-060):
  - `GET  /core/api/v1/grade-batches?status=`
  - `GET  /core/api/v1/grade-batches/:id`
  - `POST /core/api/v1/grade-batches/:id/approve`
  - `POST /core/api/v1/grade-batches/:id/request-revision`
  - `POST /core/api/v1/grade-batches/bulk-lock`
  - `GET  /core/api/v1/config/school/operational-settings` (REAL — gradePublishMode)
- Domain rules: PENDING_APPROVAL -> PUBLISHED (approve). PUBLISHED -> LOCKED (bulk-lock). LOCKED immutable. Request-revision requires note. gradePublishMode from REAL endpoint.
- UI surfaces: ApprovalBatchTable; BatchReviewSheet; ApproveConfirmDialog; BulkLockDialog; GradePublishModeWarning

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | approveGradeBatch (ok/not-pending/not-found); bulkLockBatches (ok/not-published); requestRevision (ok/missing-note) |
| Integration | GradeApprovalRepository mock (list, detail, approve, bulk-lock, request-revision); SettingsRepository real endpoint for gradePublishMode |
| E2E | Storybook: Loading / List_MixedStatuses / PendingFilter / BatchReviewSheet / ApproveFlow / BulkLockFlow / SelfPublishModeWarning / EmptyState |
| Platform | bun build + tsc clean |
| Release | design-review gate pass |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E14.4 (planned)
- `docs/product/screens.md`: add Admin "Grade Approval" row -> design-ready
