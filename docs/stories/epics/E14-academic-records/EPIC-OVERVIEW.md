# Epic E14 — Academic Records (Điểm số & Học bạ)

## Summary

Cấu hình thang điểm + khung đánh giá (E14.1) và nhập điểm (E14.2) cho giáo viên
bộ môn. Đây là luồng hoàn chỉnh từ setup → entry → học bạ. E14 phụ thuộc vào
E12 (subjects, class management) và BE E06 (grade scale + assessment scheme).

## Scope

| US | Screen | BE readiness | Design |
| --- | --- | --- | --- |
| E14.1 | Assessment Scheme Config (US-E12.6 renamed/promoted) | core REAL (US-059) | design-ready (`assessment.jsx` 1506) |
| E14.2 | Grade Entry screen (teacher enters scores) | core planned (US-060) | design-ready (`grade-entry.jsx` 1506) |
| E14.4 | Grade Approval pipeline (admin approves PENDING_APPROVAL batches) | core planned (US-060) | design-ready (`grade-approval.jsx` 1506) |
| E14.5 | Academic Record Viewer / Hoc ba (multi-role: student/parent/teacher/admin) | core planned (US-064) | design-ready (`academic-record-view.jsx` 1506) |
| E14.6 | Academic Record Seal (admin bulk-seal + two-ADMIN unseal, allLocked gate) | core planned (US-064) | design-ready (`academic-records.jsx` 1506) |

## BE Dependencies

- `core` `/api/v1/grade-scale` (REAL — US-059 live)
- `core` `/api/v1/subjects/:id/assessment-schemes/:year` (REAL — US-059 live)
- `core` `/api/v1/config/school/operational-settings` (REAL — US-059 live, gradePublishMode)
- `core` grade entry endpoints (US-060 — BE planned, mock-first)
- `core` grade approval endpoints (US-060 — BE planned, mock-first)
- `core` academic record endpoints (US-064 — BE planned, mock-first)
- `core` academic record seal/unseal endpoints (US-064 — BE planned, mock-first)

## Notes

- US-E12.6 (assessment scheme) est already a planned story packet in E12.
  E14.1 is its promoted/renamed entry under E14 to clarify the epic grouping.
  When FE team implements, they should work from US-E12.6 packet.
  DESIGN NOW AVAILABLE: `design_src/edu/assessment.jsx` (1506 handoff, DR-001 resolved).
- E14.2 is grade entry by teacher.
  DESIGN NOW AVAILABLE: `design_src/edu/grade-entry.jsx` (1506 handoff).
- E14.4 grade approval: admin approves PENDING_APPROVAL -> PUBLISHED -> LOCKED. Only relevant when gradePublishMode = ADMIN_APPROVAL.
- E14.5 academic record viewer: read-only hoc ba per student, multi-year timeline, all roles.
- E14.6 academic record seal: HIGH-RISK — two-ADMIN unseal gate; ADR required (>= 0023).
