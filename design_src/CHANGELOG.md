# CHANGELOG — UI/UX 5 ngày gần nhất (28/08 → 02/09/2026)

## 1. Trải nghiệm học tập học sinh (ADR 0143) — mới
- **Khoá học của tôi:** card mỗi môn thêm "mục sắp đến hạn gần nhất" + số mục đang mở; BỎ % tiến độ và điểm TB (backend chưa có). File: `edu/course-items.jsx` (StudentCoursesV2).
- **Chi tiết khoá học:** MỘT timeline dọc duy nhất nhóm theo tuần — icon loại mục, khung thời gian, trạng thái (Sắp mở / Đang mở / Đã đóng — màu + nhãn chữ). Không còn tab Bài giảng/Bài tập/Kiểm tra trong khoá học.
- **Gộp sidebar học sinh:** bỏ 2 mục "Bài tập", "Bài kiểm tra" — thành 2 tab lọc xuyên môn bên trong "Khoá học" (mọi ASSIGNMENT/EXAM, sắp hết hạn trước, badge môn học). Bộ lọc trạng thái bên trong chuyển sang tab gạch chân để không trùng 2 hàng pill.
- **Trạng thái "Đã đóng — chỉ xem":** banner rõ ràng — vẫn đọc để ôn tập, khoá nộp.

## 2. Màn hình học tập (Course Player, kiểu Udemy) — mới
- Nội dung trái + panel "Nội dung khoá học" phải (theo tuần, đánh dấu mục đang học, 🔒 mục chưa mở, ✓ đã nộp), nút Trước / Mục tiếp theo.
- Theo loại: LESSON = video player 16:9; DOCUMENT = link ngoài + khung xem trước; ASSIGNMENT = đề + tệp đính kèm + vùng kéo-thả nộp (1 lần duy nhất); EXAM = màn giới thiệu → "Vào làm bài".
- Tabs phụ: Tổng quan / Ghi chú / Hỏi & Đáp. File: `edu/course-player.jsx`.

## 3. Role giáo viên — gộp quanh hub "Lớp học" — redesign
- **Sidebar:** BỎ mục "Khoá học"; "Lớp học" là trung tâm duy nhất; kho cá nhân (Kho bài giảng, Kho đề thi, Kế hoạch giảng dạy) giữ nguyên.
- **Danh sách lớp:** badge vai trò GVCN (tím) / GVBM · Toán (xanh); số liệu theo vai trò — GVBM: tiến độ tiết dạy + bài chờ chấm; GVCN: chuyên cần + vi phạm chờ xử lý.
- **Chi tiết lớp — tab theo vai trò:**
  - Học sinh: GVBM nhập/xem điểm môn mình dạy; GVCN xem toàn cảnh lớp (chỉ đọc).
  - Thời khoá biểu: lịch tuần của lớp, highlight tiết của mình; sổ đầu bài theo NGÀY (GVCN viết/sửa, badge chờ BGH duyệt; GVBM chỉ xem).
  - Khoá học online: timeline (lớp × môn) — kéo-thả sắp xếp, sửa start/due ngay trên dòng, thêm mục 4 loại; GVCN xem môn khác ở chế độ chỉ đọc (dropdown chọn môn).
  - Chủ nhiệm (chỉ GVCN): điểm danh hôm nay, vi phạm chờ xử lý, đơn xin nghỉ duyệt/từ chối.
- File: `edu/class-hub.jsx`.

## 4. Theo feedback teammate (vtp)
- Đổi tên tab "Tiết học" → **"Thời khoá biểu"**.
- Panel cạnh thời khoá biểu → 3 lối tắt: Kế hoạch giảng dạy (giáo án, tài liệu) / Điểm danh / Sổ đầu bài — bấm điều hướng thẳng.
- Lịch dạy tuần: click 1 tiết → mở đúng trang Lớp học của lớp đó, tab Thời khoá biểu.

## 5. Điều hướng & nhất quán dữ liệu
- Dashboard giáo viên: mọi lối tắt (tiết sắp dạy, chờ chấm) dẫn về đúng lớp + đúng tab — không còn đường vào "Khoá học" riêng. Deep-link qua `navParam {classId, tab}`.
- Đồng bộ danh sách lớp Class Hub với thời khoá biểu: 10A1 (GVCN+GVBM), 10A2, 11B2, 12C1.
- Timeline readonly mode: ẩn chevron/expand, ghi chú "Chỉ đọc — khoá học do GV bộ môn quản lý".

Trước giai đoạn này (đã bàn giao): notification bell 3 tab, avatar dropdown (dark mode / ngôn ngữ / logout), sidebar footer rút gọn, gộp Messaging Direct+Group, parent portal role-filtering.
