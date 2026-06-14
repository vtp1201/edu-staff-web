# US-E09.2 Student Conduct Screen (Student / Parent)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E09.1 (discipline data written by teacher), BE core discipline endpoints
- Blocks: none
- Feature module(s) cham: `src/features/discipline/` (shared with E09.1)
- Shared contract/file: `bootstrap/endpoint/discipline.endpoint.ts`; shared entities from E09.1

## Product Contract

Hoc sinh xem lich su hanh kiem ca nhan (diem + xep loai + danh sach vi pham)
va gui don xin nghi phep. Phu huynh xem hanh kiem con va xem / gui don nghi phep.

**Student view (StudentDisciplineScreen):**
- Card hanh kiem hoc ky: diem (0-100), xep loai badge (Tot/Kha/TB/Yeu), tong vi pham, tong ngay vang.
- Lich su vi pham ca nhan (hoc sinh chi thay cua chinh minh).
- Form gui don xin nghi phep: ngay bat dau, ngay ket thuc, loai nghi (benh/ca nhan/su kien/khac), ly do tu do.
- Lich su cac don da gui: trang thai (cho duyet / da duyet / tu choi + ly do).

**Parent view:**
- Tuong tu student view nhung hien thi thong tin con (ten hoc sinh, lop).
- Parent co the gui don xin nghi thay con.

RBAC: Student chi xem hanh kiem cua chinh minh. Parent chi xem hanh kiem con minh.
GVBM / admin khong vao man hinh nay.
Mock-first: BE core discipline service chua ship.

## Relevant Product Docs

- `docs/product/screens.md` — Student section "Conduct + leave request" row
- `design_src/edu/discipline.jsx` — StudentDisciplineScreen component (1506)
- Epic overview: `docs/stories/epics/E09-discipline-conduct/EPIC-OVERVIEW.md`

## Acceptance Criteria

- AC-1 (loading): Skeleton loader khi load du lieu hanh kiem.
- AC-2 (conduct card): Diem hanh kiem + xep loai hien thi dung theo gia tri tu server; badge mau khop design system (Tot=success, Kha=primary, TB=warning, Yeu=error).
- AC-3 (violations list): Danh sach vi pham chi hien thi vi pham cua hoc sinh dang dang nhap (khong lo vi pham nguoi khac).
- AC-4 (leave request form): Form gui don nghi hop le: chon ngay, loai, nhap ly do (>= 10 ky tu); submit thanh cong -> don xuat hien trong lich su voi trang thai "Cho duyet".
- AC-5 (leave history): Don da gui hien thi trang thai badge chinh xac (pending=warning, approved=success, rejected=error); don bi tu choi hien thi ly do tu choi.
- AC-6 (parent view): Parent thay ten + lop cua con tren man hinh; du lieu giong student view.
- AC-7 (empty states): Chua co vi pham -> empty state "Chua co vi pham"; chua gui don nao -> "Chua co don nghi phep".
- AC-8 (error state): API loi -> error banner co nut thu lai.
- AC-9 (a11y): Form inputs co label lien ket; trang thai khong chi truyen qua mau; keyboard navigable.
- AC-10 (i18n): Tat ca strings qua namespace `discipline`.

## Design Notes

- Route: `/student/conduct` (student), `/parent/children/:id/conduct` (parent)
- Design file: `design_src/edu/discipline.jsx` — StudentDisciplineScreen
- Commands: `submitLeaveRequest`
- Queries: `getMyConductSummary`, `getMyViolations`, `getMyLeaveRequests`
- API (mock-first):
  - `GET  /core/api/v1/discipline/my-conduct?semester=`
  - `GET  /core/api/v1/discipline/my-violations`
  - `GET  /core/api/v1/discipline/my-leave-requests`
  - `POST /core/api/v1/discipline/leave-requests`
- Domain rules: Student can only submit leave request for future or today dates; reason min 10 chars.
- UI surfaces: Conduct summary card; violations list; leave request form (drawer/sheet); leave history list

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | submitLeaveRequest use-case (valid/missing-reason/past-date); getMyConductSummary mapper (diem -> xep loai) |
| Integration | DisciplineRepository mock (getMyConduct, submitLeave, getMyLeaveRequests) |
| E2E | Storybook: Loading / WithViolations / EmptyViolations / LeaveFormSubmit / LeaveHistoryWithRejection |
| Platform | bun build + tsc clean |
| Release | design-review gate pass |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E09.2 (planned)
- `docs/product/screens.md`: Student "Conduct + leave request" -> design-ready
