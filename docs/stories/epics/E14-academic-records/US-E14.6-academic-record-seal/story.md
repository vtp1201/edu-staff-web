# US-E14.6 Academic Record Seal (Admin Bulk-Seal + Two-ADMIN Unseal)

## Status

planned

## Lane

high-risk

## Dependencies

- Depends on: US-E14.4 (grade approval — ALL grades must be LOCKED before sealing allowed), US-E14.5 (academic record viewer — seal status indicator)
- Blocks: none
- Feature module(s) cham: `src/features/academic-records/` (shared with E14.5)
- Shared contract/file: `bootstrap/endpoint/academic-records.endpoint.ts`; AcademicRecordSealEntity

## Product Contract

Admin niêm phong hoc ba cho ca lop / ca truong theo hoc ky / nam hoc
(`/admin/academic-records`). Dieu kien: tat ca diem phai o trang thai LOCKED
(allLocked gate). Unseal yeu cau 2 admin xac nhan (data integrity).

**Bulk-seal screen:**
- Selector: chon lop + hoc ky + nam hoc.
- allLocked gate: kiem tra tat ca cot diem cua lop do o LOCKED chua.
  - OK: hien green indicator "Tat ca diem da duoc khoa" + nut "Niêm phong hoc ba".
  - NOT OK: hien warning "Con [N] diem chua duoc khoa" + danh sach mon con thieu + link "Khoa diem" -> E14.4.
- "Niêm phong hoc ba" -> confirm dialog "Sau khi niêm phong, hoc ba khong the chinh sua ma khong co xac nhan BGH kep." -> OK -> seal.
- Sau khi seal: thanh cong -> indicator "Da niêm phong" + ngay / nguoi niêm phong.

**Audit trail:**
- Bang lich su niêm phong: lop, hoc ky, nam hoc, nguoi niêm phong, ngay, trang thai (niêm phong / da mo phong).

**Two-ADMIN unseal (data integrity gate):**
- Chi hieu truong hoac admin cap tren co the khoi dong unseal.
- Buoc 1: Admin 1 yeu cau mo phong + nhap ly do (bat buoc).
- Buoc 2: Admin 2 (khac Admin 1) xac nhan mo phong. Neu chi co 1 admin -> show warning "Can them 1 admin xac nhan".
- Sau khi 2 admin xac nhan: unseal thanh cong -> trang thai tro ve co the chinh sua.
- [ASSUMPTION] Two-ADMIN confirmation: Admin 2 xac nhan qua man hinh pending-unseal-requests hoac trong cung session neu co 2 admin online.

RBAC: Chi admin (BGH). High-risk lane: data integrity critical.
Mock-first: `core` academic-record seal endpoints chua ship (US-064 BE planned).

## Relevant Product Docs

- `docs/product/screens.md` — Admin section (academic-records seal — new row)
- `design_src/edu/academic-records.jsx` — AcademicRecordSealScreen (1506)
- US-E14.5 (record viewer — receives seal status from this story)
- US-E12.12 (audit log — records seal/unseal actions)

## Acceptance Criteria

- AC-1 (loading): Skeleton khi load trang thai seal.
- AC-2 (allLocked gate — OK): Khi tat ca diem LOCKED -> green indicator + nut "Niêm phong" enabled; hien so mon / so hoc sinh.
- AC-3 (allLocked gate — NOT OK): Co diem chua LOCKED -> warning banner + danh sach mon chua khoa + link den grade-approval (E14.4); nut "Niêm phong" disabled.
- AC-4 (seal confirm dialog): "Niêm phong hoc ba" -> dialog canh bao ro rang -> OK -> seal action gui; toast "Da niêm phong hoc ba [lop] [hoc ky]".
- AC-5 (seal success): Sau khi seal -> indicator "Da niêm phong" + ten nguoi + ngay giay.
- AC-6 (audit trail): Bang lich su hien chinh xac: lop, hoc ky, nam hoc, nguoi seal, ngay, trang thai.
- AC-7 (unseal — step 1): Admin 1 click "Yeu cau mo phong" -> form nhap ly do (bat buoc >= 20 ky tu) -> submit -> pending state.
- AC-8 (unseal — step 2): Admin 2 (khac Admin 1) vao trang -> thay yeu cau pending -> xac nhan -> unseal thanh cong; neu Admin 2 cung la Admin 1 -> dialog bao loi "Can admin khac xac nhan".
- AC-9 (RBAC): Chi admin; teacher/student/parent -> redirect.
- AC-10 (a11y): Confirm dialog trap focus; warning banner co role="alert"; WCAG AA; lock icon co aria-label.
- AC-11 (i18n): Tat ca strings qua namespace `academicRecordSeal`.

## Design Notes

- Route: `/admin/academic-records`
- Design file: `design_src/edu/academic-records.jsx` — AcademicRecordSealScreen, AllLockedGate, SealConfirmDialog, UnsealWorkflow, AuditTrailTable
- Commands: `sealAcademicRecord`, `initiateUnseal`, `confirmUnseal`
- Queries: `getRecordSealStatus` (class x term x year), `getSealAuditTrail`, `getPendingUnsealRequests`
- API (mock-first — core planned US-064):
  - `GET  /core/api/v1/academic-records/seal-status?classId=&term=&year=`
  - `POST /core/api/v1/academic-records/seal`
  - `POST /core/api/v1/academic-records/unseal/initiate`
  - `POST /core/api/v1/academic-records/unseal/confirm`
  - `GET  /core/api/v1/academic-records/seal-audit-trail`
  - `GET  /core/api/v1/academic-records/unseal-requests?status=pending`
- Domain rules: allLocked gate: ALL grade batches for (class, term, year) must be LOCKED. Two-ADMIN unseal: Admin 2 != Admin 1 (server-enforced). Unseal reason min 20 chars. Seal/unseal actions append to audit-log (US-E12.12).
- UI surfaces: AllLockedGate (OK vs NOT OK states); SealConfirmDialog; UnsealInitiateForm; UnsealConfirmDialog; AuditTrailTable; ClassTermYearSelector

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | sealAcademicRecord (ok/not-all-locked/already-sealed); initiateUnseal (ok/not-sealed/missing-reason); confirmUnseal (ok/same-admin-as-initiator/no-pending-request) |
| Integration | AcademicRecordSealRepository mock (seal, unseal-initiate, unseal-confirm, audit-trail, pending-requests) |
| E2E | Storybook: Loading / AllLockedGate_OK / AllLockedGate_NotOK / SealConfirmDialog / SealSuccess / UnsealInitiate / UnsealConfirm / UnsealSameAdminError / AuditTrail |
| Platform | bun build + tsc clean |
| Release | design-review gate pass; security review for two-ADMIN gate (ADR candidate) |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E14.6 (planned, high-risk)
- `docs/product/screens.md`: add Admin "Academic Record Seal" row -> design-ready
- [FLAG for ba-lead]: Two-ADMIN confirmation mechanism requires ADR (decision >= 0023). Session-based vs notification-based confirmation approach to be decided.
