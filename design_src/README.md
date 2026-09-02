# EduPortal — Design Source (đóng gói cho FE)

## Cấu trúc
- `EduPortal.html` — entry point (mở trực tiếp bằng trình duyệt, React 18 + Babel standalone, không cần build).
- `edu/tokens.js` — design tokens (`window.T`): màu, primary `#5D87FF`, semantic colors. FE map sang CSS variables / theme.
- `edu/icons.jsx` — bộ icon SVG stroke (24px viewBox, `Icon name=… size color strokeWidth`).
- `edu/ui.jsx` — layout khung: Sidebar (menu theo role), Header, Badge, Avatar, ProgressBar, notification bell, avatar dropdown (dark mode, ngôn ngữ VI/EN, logout).
- `edu/app.jsx` — root: role switcher, routing theo `section` + `navParam` (deep-link vào lớp/tab).

## Module theo nghiệp vụ (ADR 0143)
- `edu/course-items.jsx` — data model course_items (4 loại: lesson / assignment / exam / document; start_at & due_at nullable), helpers trạng thái (`ciStatus`: upcoming / open / closed), timeline khoá học (`CourseTimelinePage`, mode: student / teacher / readonly), card môn học (`StudentCoursesV2`), bộ lọc xuyên môn (`CrossSubjectList`).
- `edu/course-player.jsx` — màn hình học tập kiểu Udemy (`CourseItemPlayer`): video / tài liệu / nộp bài tập (1 lần) / vào bài kiểm tra + panel nội dung khoá học.
- `edu/class-hub.jsx` — hub "Lớp học" của giáo viên (`ClassHubScreen`): danh sách lớp theo vai trò GVCN/GVBM, tab Học sinh / Thời khoá biểu / Khoá học online / Chủ nhiệm.
- `edu/teacher.jsx`, `edu/student.jsx` — dashboard + màn hình theo role; các file còn lại (attendance-portal, academic-record-view, messaging, discipline…) là các phân hệ đã bàn giao trước.

## Quy ước cho FE
- Trạng thái mục khoá học luôn mã hoá bằng CẢ màu và nhãn chữ: Sắp mở (info) / Đang mở (success) / Đã đóng — chỉ xem (muted).
- Bài tập nộp đúng 1 lần; sau due_at khoá nộp nhưng vẫn xem được.
- "Bài tập"/"Bài kiểm tra" của học sinh là bộ lọc trên cùng dữ liệu timeline, không phải nguồn riêng.
- Demo neo thời gian hiện tại = `CI_NOW` (27/04/2026) trong `course-items.jsx` — FE thay bằng clock thật.

Chi tiết thay đổi gần nhất: xem `CHANGELOG.md`.
