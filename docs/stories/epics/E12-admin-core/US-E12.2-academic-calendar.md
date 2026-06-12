# US-E12.2 Academic Calendar Configuration

## Status

planned

## Lane

normal

## Product Contract

Admin cấu hình danh sách năm học và học kỳ của trường: tạo năm học mới (label),
thêm / chỉnh sửa / xóa học kỳ trong năm (tên, startDate, endDate), set năm học
là "active". Màn hình dạng accordion — mỗi năm học expand ra danh sách kỳ.
Inline edit cho từng kỳ (date inputs), confirm delete có cảnh báo nếu kỳ đã có điểm.

BE story tương ứng: US-042 (academic calendar).

## Relevant Product Docs

- `docs/product/screens.md` — mục "Academic Calendar config"
- `design_src/edu/calendar.jsx` — **pixel reference** (route `/admin/calendar`, US-042)
- BE API (mock-first):
  - `GET  /api/v1/core/academic-years`
  - `POST /api/v1/core/academic-years`
  - `PATCH /api/v1/core/academic-years/:id`
  - `DELETE /api/v1/core/academic-years/:id`
  - `POST /api/v1/core/academic-years/:id/terms`
  - `PATCH /api/v1/core/academic-years/:yearId/terms/:termId`
  - `DELETE /api/v1/core/academic-years/:yearId/terms/:termId`

## Acceptance Criteria

- Route `app/[locale]/t/[tenant]/(app)/admin/calendar/page.tsx`.
- Accordion list: mỗi năm học có expand/collapse, badge "Hiện tại" cho active year.
- Inline edit kỳ: click edit icon → date inputs appear in row → Save / Cancel.
- Validate: startDate < endDate; kỳ không được overlap trong cùng năm.
- Delete: confirm dialog; cảnh báo nếu `hasGrades: true`.
- Add year form: label input + submit.
- Mock-first pattern (DI).
- `bun build` xanh.
- Design review pass.

## Design Notes

- Design file: `design_src/edu/calendar.jsx`.
- Date inputs: native `<input type="date">` trong prototype → swap cho shadcn
  `Calendar + Popover` trong Next.js.
- Token: `successLight` bg cho active year row.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | date validation (overlap, order) |
| Integration | mock repo; add/edit/delete term round-trip |
| E2E | — |
| Platform | `bun build` xanh |
| Release | design-review gate pass |

## Role Guard

Route `/admin/calendar` — chỉ role `admin` (decision `0022`).
BE dependency: IAM claim `role: "admin"` required.

## Harness Delta

—
