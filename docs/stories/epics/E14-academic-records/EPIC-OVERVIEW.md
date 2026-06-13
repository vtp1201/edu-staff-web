# Epic E14 — Academic Records (Điểm số & Học bạ)

## Summary

Cấu hình thang điểm + khung đánh giá (E14.1) và nhập điểm (E14.2) cho giáo viên
bộ môn. Đây là luồng hoàn chỉnh từ setup → entry → học bạ. E14 phụ thuộc vào
E12 (subjects, class management) và BE E06 (grade scale + assessment scheme).

## Scope

| US | Screen | BE readiness | Design |
| --- | --- | --- | --- |
| E14.1 | Assessment Scheme Config (US-E12.6 renamed/promoted) | core REAL (US-059) | design-pending (DR-001) |
| E14.2 | Grade Entry screen (teacher enters scores) | core planned (US-060) | `teacher.jsx` (TeacherGrades) |

## BE Dependencies

- `core` `/api/v1/grade-scale` (REAL — US-059 live)
- `core` `/api/v1/subjects/:id/assessment-schemes/:year` (REAL — US-059 live)
- `core` grade entry endpoints (US-060 — BE planned)

## Notes

- US-E12.6 (assessment scheme) est already a planned story packet in E12.
  E14.1 is its promoted/renamed entry under E14 to clarify the epic grouping.
  When FE team implements, they should work from US-E12.6 packet (it has the design gap note and DR-001).
- E14.2 is new — grade entry by teacher.
