# CHANGELOG — UI/UX

## Bundle 02/09/2026 v3 — R1–R3
- **R1 Lịch sử liên kết (DR-023):** bỏ card dưới bảng (v2); khôi phục audit trail BÊN TRONG dialog chi tiết liên kết — `PLAuditTrailSection` với 4 trạng thái: skeleton loading / lỗi + Thử lại / rỗng / danh sách. `PL_AUDIT_ACTION` mở rộng thêm `consent_agreed` / `consent_declined` bên cạnh `created` / `unlinked`. Backend chưa có endpoint (draft /audit/me, /audit?actorId) — vẫn mock. Lưu ý: file parent-links.jsx bản repo + DR-023 đính kèm KHÔNG đến được bundle này — section được dựng theo mô tả DR-023; FE đối chiếu lại với bản repo khi merge.
- **R2 Dark mode:** thêm 3 token — `successText` (light #0E9A82 / dark #3FD0B3), `tealText` (light #00806F / dark #4FC3B5), `mediaSurface` (#0f1117, nền video — cố ý giữ tối ở cả 2 theme). Quét sạch hex hardcode trong class-hub / course-items / course-player / attendance-portal: #0E9A82→T.successText, #00806F→T.tealText, #C3CBD9→T.border, #EEF1F6→T.chipBg, #FBFCFE→T.bg, #0f1117→T.mediaSurface. Contrast trên nền dark #1E2630: #3FD0B3 ≈ 8.0:1, #4FC3B5 ≈ 7.5:1 — đạt AA (cả AAA cho text thường). FE map: edu-success-text / edu-teal-text / edu-media-surface.
- **R3:** sửa comment sót "không gắn cứng vào tiết" → "chuẩn bị gắn vào tiết (period-preps)" trong class-hub.jsx.


## Bundle 02/09/2026 (chiều) — khớp contract backend D1–D9
- **D1 Thời khoá biểu lớp (class-hub):** tách 2 sổ — (a) "Sổ chủ nhiệm (theo ngày)" GVCN viết, trạng thái Nháp / Chờ BGH duyệt / Đã duyệt / Bị trả lại, nút Lưu nháp + Gửi duyệt; (b) trên mỗi tiết của GVBM thêm 2 hành động inline: "Ghi sổ đầu bài tiết" (Tên bài dạy ≤200 bắt buộc, Nhận xét ≤2000, Xếp loại A/B/C/D, Số HS vắng 0–200 — tham khảo; không có duyệt; GVCN xem cả lớp chỉ đọc) và "Chuẩn bị tiết" (ghi chú + 1 giáo án từ KHGD + ≤20 link tài liệu, KHÔNG upload). (c) Panel phải = tiết sắp tới + trạng thái đã chuẩn bị/đã ghi sổ + 3 lối tắt; bỏ câu "không gắn cứng vào tiết" — chuẩn bị GẮN vào tiết. (d) Tiết có giờ bắt đầu/kết thúc (bell schedule) + nhãn "Đang diễn ra".
- **D2 Course Player:** bỏ tab Ghi chú & Hỏi Đáp (backend không có); bỏ thanh tab — chỉ còn mục Tổng quan (mô tả + khung thời gian).
- **D3 Nộp bài tập:** mặc định = văn bản (≤20.000 ký tự, có counter) + link bài làm, xác nhận "chỉ nộp 1 lần" trước khi nộp, sau nộp hiện "Đã nộp lúc …"; biến thể drop-zone đính kèm tệp đánh dấu "Sau khi backend hỗ trợ" (component dùng chung `CiSubmitBox`).
- **D4 Bài giảng:** mặc định nội dung văn bản/rich text; khung video 16:9 chỉ xuất hiện khi mục có link nhúng được (`item.embed`).
- **D5 Card lớp GVBM:** bỏ "Tiết đã dạy x/24" (không có nguồn) → "Vắng hôm nay" + "Bài chờ chấm". GVCN giữ Chuyên cần % + Vi phạm chờ.
- **D6 Đơn xin nghỉ (PH):** bỏ "theo tiết" → Từ ngày / Đến hết ngày; thêm đính kèm tối đa 3 tệp JPG/PNG/PDF ≤5 MB/tệp.
- **D7 Timeline học sinh:** ẩn mọi mục chưa mở trừ KIỂM TRA (vẫn hiện "Sắp mở" 🔒) — áp dụng cho timeline, course player, bộ lọc xuyên môn (tab "Sắp mở" chỉ còn ở Bài kiểm tra) và card môn. Giáo viên thấy đủ 3 trạng thái. Helper: `ciVisibleToStudent`.
- **D8 Lịch sử liên kết (parent-links):** không tìm thấy mục này trong bất kỳ bundle trước nào (kể cả design_handoff cũ) — đã DỰNG MỚI card "Lịch sử liên kết" (audit trail tạo/gỡ liên kết + consent, chỉ đọc) dưới bảng liên kết. FE kiểm tra lại với nguồn "đã build trước đó" nếu có repo khác.
- **D9 Chế độ tối:** bỏ filter invert/hue-rotate → bộ token dark thật trong `tokens.js` (`T_DARK`, `window.applyTheme(dark)`): nền/card/border/chữ/các *Light đổi theo theme; ảnh, avatar, màu môn giữ nguyên. Thêm token `chipBg`, `inputBg` thay màu hardcode.

## 5 ngày trước đó (28/08 → 02/09/2026)

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
