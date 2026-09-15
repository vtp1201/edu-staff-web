# FE → BE (2026-09-15): ask còn lại sau khi đóng epic E24 (Class Hub + course_items + Phase 3)

> Bối cảnh: toàn bộ 15 US E24 đã merge `main` (FE). Các ask dưới đây là gap BE phát hiện trong khi
> wire thật; FE đã code fallback nên KHÔNG block, nhưng UX bị cắt. Asks 02/09
> (`2026-09-02-fe-to-be-asks-adr0143.md` #1–#10) vẫn chưa có reply — #1 (nộp file), #4
> (`courses/me` summary) vẫn là gap lớn nhất.

| # | Mức | Ask | FE hiện làm gì |
| --- | --- | --- | --- |
| 1 | 🟡 | **TEACHER bị 403 khi `GET academic-years/*` + `/terms`** (core). Tab "Tổng hợp chuyên cần" (US-E24.14) cần range Học kỳ / Năm học. | Segmented chỉ còn "Tháng"; code HK/Năm đã có, bật khi 200. |
| 2 | 🟡 | **Endpoint "Báo phụ huynh" về chuyên cần** (noti hoặc core): gửi thông báo cho PH của HS theo `classId` + `studentMemberId` + range. Chưa có trong openapi. | Nút không render. |
| 3 | 🟢 | **STUDENT đọc `academic-years/*`** để lấy range học kỳ cho `/student/attendance` (US-E24.6). | Fallback 6 tháng gần nhất. |
| 4 | 🟢 | **PARENT đọc `GET members/{childId}/enrollment`** để lấy `classId` của con (US-E24.6 dialog xin nghỉ). | Lấy `classId` từ attendance record đầu tiên. |
| 5 | 🟢 | **Violations status model** lệch giữa design (chờ xử lý / đã xử lý) và entity BE → card "vi phạm chờ" tab Chủ nhiệm (US-E24.11) vẫn mock. | Mock + badge demo (backlog #4). |
| 6 | 🟢 | `GET student-leave-requests` **bắt buộc `classId` hoặc `studentMemberId`** → các caller legacy (teacher/principal discipline) bị từ chối trước HTTP. Xác nhận đây là hành vi mong muốn, hay cho phép list theo scope của token? | FE sẽ sửa caller (backlog #5) nếu BE giữ nguyên. |
| 7 | 🟢 | Nhắc lại ask 02/09 **#4 `GET /lms/courses/me` summary** (dueNext, openCount): card môn đang fan-out N+1 `GET courses/{id}/items`. | N+1, chấp nhận tạm. |
| 8 | 🟢 | Nhắc lại ask 02/09 **#1 nộp bài bằng tệp**: Course Player (US-E24.5) chỉ nộp text/link. | Text/link only. |

Kong smoke FE còn treo (stack local down khi chạy): `GET /lms/api/v1/lms/courses?classId=` và
`POST .../student-leave-requests/{id}/attachments` — FE sẽ chạy khi stack lên (backlog #13).
