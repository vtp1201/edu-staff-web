# E24 — Trải nghiệm học tập (course_items) + Class Hub giáo viên

> Nguồn: design bundle `~/Downloads/design_src0209` (CHANGELOG 28/08→02/09/2026) +
> edu-api **ADR 0143** *Course as container: course_items, mandatory course
> membership, exam metadata projection* (Accepted, implemented 2026-09-01/02).
> Lưu ý: "ADR 0143" là số ADR **phía edu-api**; FE ADR cao nhất hiện là 0074.
>
> Trạng thái: **PLAN — user đã chốt Q-A..Q-H (02/09), chưa slice story vào harness.**
> Ask BE ở `docs/reports/2026-09-02-fe-to-be-asks-adr0143.md`; prompt design §7 đã gửi/đang gửi.

## 1. Bối cảnh — cái gì đổi

| Phía | Có gì mới |
| --- | --- |
| Design 0209 | 4 file mới: `course-items.jsx` (StudentCoursesV2, CourseTimelinePage, CrossSubjectList), `course-player.jsx` (CourseItemPlayer), `class-hub.jsx` (ClassHubScreen), `attendance-portal.jsx` (Student/ParentAttendanceScreen). Sửa: `app.jsx` (navParam deep-link, darkMode), `ui.jsx` (sidebar bỏ notifications/profile, footer help+collapse, bell dropdown 3 tab, avatar dropdown profile/dark/lang/logout), `teacher.jsx` (click tiết → classes+tab), `student.jsx` (courses v2), `classops.jsx` (tab Tổng hợp chuyên cần), `messaging.jsx` (gộp Direct+Group), `academic-record-view.jsx` (parent child selector), `parent-links.jsx` (**xoá** audit trail DR-023 — regression?). |
| BE contract-update 02/09 | `docs/reports/2026-09-02-be-to-fe-contract-update.md`: period-logs (GVBM, theo tiết: lessonTitle/remark/grade A–D/absentCount) + period-preps (note, lessonPlanId, `materials[]` link ≤20) **đã ship**; `teachingSubjectIds[]`, `teacherName` ship; notes/Q&A **không planned**; chấm bài = US-141; draft US-244/245/249/251/254/255 (ADR 0147 mock-first theo draft). |
| edu-api (273 commit từ 10/08) | `lms` live qua Kong `/lms/api/v1` (service nhận `/api/v1/lms/...` → **đường dẫn đầy đủ `/lms/api/v1/lms/courses`**). Endpoint: courses (list/get/patch/publish), lessons, **items** (GET, POST documents, PUT order, PATCH/DELETE item), assignments (+submissions single-attempt, `/me`). `core`: **period-preps**, **period-logs**, **homeroom-entries** (+submit/approve/reject/revise), student-leave-requests approve/reject (GVCN), student-violations, attendance by class/member, subject-assignments. Draft (US-254, chưa deploy): `courses/me`, `items/{id}/complete`, `courses/{id}/progress`. |
| FE hiện tại | Student LMS (`features/lms`) **force-mock** (ADR 0073) với `LMS_EP` **sai path + sai shape** so với contract thật. Không có teacher course-management, không có class detail (chỉ `/teacher/classes/[classId]/students`). Class-log, attendance, timetable, staff-leave đã real; discipline/student-absence force-mock. |

## 2. Nguyên tắc

- **State mục = từ BE** (`state: UPCOMING_HIDDEN|OPEN|CLOSED`), KHÔNG tính lại bằng clock client (design dùng `CI_NOW` chỉ để demo). Student không nhận item chưa mở (trừ EXAM) → UI "🔒 sắp mở" chỉ có ở teacher mode + EXAM.
- **Nhóm theo tuần** tính ở client từ `startAt` (ISO week; `startAt=null` → nhóm "Luôn mở"). Nhãn "Tuần 30" cần academic-week từ core — hỏi BE (#5); fallback "Tuần dd/MM – dd/MM".
- Design system tối thượng: token `edu-*`, KHÔNG hex `#0E9A82`/`#EEF1F6` trong design → map `text-edu-success-text`/`bg-muted`.
- Mọi id core đọc từ claim `memberId` (ADR 0074).
- Mock-first chỉ cho phần BE chưa có (US-254, upload, grade) — `USE_MOCK ? Mock : Real` chuẩn, **bỏ force-mock ADR 0073** khi US-E24.1 xong.

## 3. Phân kỳ

### Phase 0 — Sync + contract (lane tiny/normal)

| US | Nội dung | Ghi chú |
| --- | --- | --- |
| **E24.0** Sync design 0209 | Copy 4 file mới + 9 file sửa + `EduPortal.html` vào `design_src/edu/`. **GIỮ** 5 file uiux team tự viết (DR-020..023: assignments/lesson-plan/question-bank/staff-discipline/student-absences.jsx) vì bundle mới không ship chúng nhưng cũng không thay thế. **KHÔNG** overwrite `parent-links.jsx` cho tới khi designer xác nhận việc bỏ audit trail. Cập nhật `design-spec.jsonc` (class-hub, course-timeline, course-player, attendance-portal), `screens.md`, `design-changelog.md`. | Cần user chốt (Q-A, Q-G) |
| **E24.1** LMS contract re-point | ADR FE 0075 "adopt course_items, supersede 0073" (mẫu 0053..0061). Viết lại `LMS_EP` theo openapi thật (`/lms/api/v1/lms/…`); DTO `Course/CourseItem/Assignment/Submission`; xoá endpoint không tồn tại (`completeLesson`, `note`, `questions`, `students/{id}/assignments`); repo real + mock cùng interface; `lms.di.ts` về `USE_MOCK` gate. ADR FE 0076 "mock-first theo `openapi.draft.yaml`" + thêm draft vào bảng Source of truth `.claude/rules/api-integration.md`. Smoke curl qua Kong. | Mở khoá toàn Phase 1 |

### Phase 1 — Học sinh (ADR 0143) — BE đã sẵn

| US | Màn / route | BE | Ghi chú |
| --- | --- | --- | --- |
| **E24.2** Khoá học của tôi v2 | `/student/courses` — card: môn, GV, "Sắp đến hạn" (mục due gần nhất, cảnh báo ≤48h), "N mục đang mở"; BỎ % tiến độ + điểm TB | `GET courses?classId` + `GET courses/{id}/items` (N+1) | Chờ `courses/me` (US-254) để bỏ N+1 — ask #4 |
| **E24.3** Timeline khoá học | `/student/courses/[courseId]` — 1 timeline dọc theo tuần, chip loại, khung thời gian, pill trạng thái (màu + chữ), banner "Đã đóng — chỉ xem"; thay `lesson-player` chapter list | `GET items` | Reuse `StatusBadge` shared |
| **E24.4** Tab xuyên môn Bài tập / Kiểm tra | `/student/courses?view=assignment|exam`, sub-tab Đang mở/Sắp mở/Đã đóng (dạng gạch chân); **bỏ sidebar** `/student/assignments`, `/student/exams` → redirect vào view tương ứng; giữ `/student/exams/[examId]` (exam flow) | items của mọi course, lọc `itemType` | Q-C |
| **E24.5** Course Player (Udemy) | `/student/courses/[courseId]/items/[itemId]` — trái: nội dung theo loại; phải: panel "Nội dung khoá học" theo tuần (đang học/✓; 🔒 chỉ EXAM), Prev/Next; **chỉ tab Tổng quan** (Ghi chú/Hỏi&Đáp BE không planned → bỏ) | LESSON `GET lessons/{id}` (content text — **không có video**, ask #3); DOCUMENT `url` + embed allowlist; ASSIGNMENT `POST submissions` (**text only**, ask #1) + `GET submissions/me` (409 already-submitted); EXAM → `examUrl`/`/student/exams/[examId]` | Cần design chỉnh (§7 D2, D3) |
| **E24.6** Chuyên cần (student) | `/student/attendance` — stat + bar theo tháng + danh sách vắng; parent đã có `/parent/attendance` → thêm dialog "Xin phép nghỉ" (startDate/endDate, không có "theo tiết"; đính kèm theo draft US-249) | `GET members/{me}/attendance`, `POST conduct/student-leave-requests` | Design chỉnh dialog (§7 D6) |

### Phase 2 — Giáo viên: Class Hub — core đã sẵn, lms teacher-mode sẵn

| US | Màn / route | BE | Ghi chú |
| --- | --- | --- | --- |
| **E24.7** Danh sách lớp theo vai trò | `/teacher/classes` — badge GVCN (purple) / GVBM·Môn (primary); KPI GVBM: `pendingGrading` + `absentToday` (draft US-255, mock theo draft); GVCN: chuyên cần % (draft US-245), vi phạm chờ + đơn nghỉ chờ (draft US-251 hoặc list real). Mở rộng `TeacherClass` → `subjects[]` từ `teachingSubjectIds[]` (đã ship) | `classes` (có `teachingSubjectIds`, `homeroomTeacherId`), drafts US-245/251/255 | "Tiết đã dạy X/Y" không có nguồn → đề nghị design bỏ (§7 D5) |
| **E24.8** Class detail shell + deep-link | `/teacher/classes/[classId]?tab=students|timetable|course|homeroom`; breadcrumb; tab theo vai trò; roster hiện tại (`/students`) chuyển thành tab; dashboard "tiết sắp dạy"/"chờ chấm" + ô lịch tuần `/teacher/schedule` → `?tab=timetable|students` | — | Đổi tên "Tiết học" → "Thời khoá biểu" (i18n key) |
| **E24.9** Tab Thời khoá biểu + sổ đầu bài | Lịch tuần của lớp (`teacherName` từ slot), highlight tiết mình; **mỗi tiết của mình**: ghi sổ đầu bài tiết (`period-logs`: lessonTitle, remark, grade A–D, absentCount) + chuẩn bị tiết (`period-preps`: note, lesson plan, materials link); **mỗi ngày**: sổ chủ nhiệm (GVCN viết/submit, badge trạng thái; GVBM đọc — ask #9) — reuse `features/class-log`; aside 3 lối tắt KHGD / Điểm danh / Sổ đầu bài | timetable, period-logs, period-preps (ship 02/09), homeroom-entries (real) | **Design chưa có UI period-log/period-prep theo tiết** → §7 D1 |
| **E24.10** Tab Khoá học online (teacher) | Timeline mode teacher cho course môn mình: kéo-thả (`PUT items/order` — gửi **đủ toàn bộ** itemIds), sửa start/due inline (`PATCH item`; EXAM → disable, 409 `LMS_EXAM_WINDOW_NOT_EDITABLE`), "Thêm mục": Tài liệu → `POST items/documents`; Bài giảng → `POST lessons`; Bài tập → `POST assignments{courseId}`; **Kiểm tra → không tạo ở đây** (projection từ core) → link sang Kho đề/class-exams (ask #6). GVCN xem môn khác readonly (dropdown môn) | courses?classId (teacher thấy course môn khác? ask #7) | Drag-drop: HTML5 native, không thêm lib |
| **E24.11** Tab Chủ nhiệm (GVCN) | Điểm danh hôm nay (3 số + "Mở sổ điểm danh"), vi phạm chờ xử lý (+link Discipline), đơn xin nghỉ Duyệt/Từ chối (đính kèm ≤3 file — draft US-249) | `GET classes/{id}/attendance?date`, `GET conduct/student-violations`, `student-leave-requests` +approve/reject (real) | Gỡ force-mock leave trong `discipline.di.ts` cho nhánh này |

### Phase 3 — Shell & các delta phụ (mỗi cái 1 US nhỏ, làm sau)

| US | Nội dung | Hiện trạng FE |
| --- | --- | --- |
| E24.12 Header/sidebar | Avatar dropdown: Hồ sơ / Chế độ tối / Ngôn ngữ / Đăng xuất; sidebar bỏ `profile` (4 role), footer = "Hướng dẫn" + "Thu gọn" inline; bỏ nút collapse nổi | `ThemeToggle` (next-themes) đã có → **không** dùng CSS `invert()` như design; `profile` còn trong nav-config |
| E24.13 Bell dropdown 3 tab | Tất cả / Chưa đọc / Hệ thống, mark-all-read, "Xem tất cả" | Cần verify `header.tsx` (CHANGELOG nói đã bàn giao trước) |
| E24.14 Tổng hợp chuyên cần (teacher attendance tab 3) | Range tháng/HK/năm, 4 StatCard, bảng theo HS với chip Nguy cơ/Cảnh báo/Đạt; "Xuất Excel" defer | `GET classes/{id}/attendance` range → aggregate client |
| E24.15 Messaging gộp Direct+Group | 1 list, nút tạo nhóm icon ở header list | `features/messaging` có `conversation-list` + `create-group-modal` |
| E24.16 Học bạ — parent chọn con | Child selector (aria-pressed) trong `/parent/academic-record` | `features/academic-records` real |
| — parent-links | Design **xoá** audit trail (DR-023 đã build). **Không regress** — chờ designer xác nhận (Q-G) | — |

## 4. Thứ tự đề xuất & phụ thuộc

```
E24.0 ─┐
E24.1 ─┴─► E24.2 ► E24.3 ► E24.5 ► E24.4      (student, BE ready)
E24.7 ► E24.8 ► E24.9 ► E24.10 ► E24.11       (teacher; E24.10 cần E24.1)
E24.6, E24.12–16 độc lập, chạy song song worktree (decision 0033)
```

Song song được: nhánh student (E24.1→E24.5) và nhánh teacher (E24.7→E24.9) chạm
feature khác nhau (`lms` vs `teacher`/`class-log`), chỉ đụng chung `nav-config.ts`
+ `messages/{vi,en}.json` → serialize 2 file này.

## 5. Quyết định của user (chốt 02/09/2026)

- **Q-A** ✅ Selective: thêm 4 file mới + 9 file sửa + EduPortal.html; giữ 5 file DR-020..023 và `parent-links.jsx`.
- **Q-B** ✅ Song song 2 worktree sau E24.0+E24.1 (decision 0033); serialize `nav-config.ts` + `messages/*`.
- **Q-C** ✅ Redirect vĩnh viễn sang `/student/courses?view=assignment|exam`; giữ `/student/exams/[examId]`.
- **Q-D** ✅ `next-themes` + token dark thật; toggle vào avatar dropdown. Không dùng `invert()`.
- **Q-E** ✅ Bỏ Ghi chú/Hỏi&Đáp khỏi player (BE không planned).
- **Q-F** ✅ Mock theo draft US-245/255 (DTO theo `openapi.draft.yaml`, badge "demo"), flip `USE_MOCK` khi ship. "Tiết đã dạy" bỏ (không có draft).
- **Q-G** ✅ Giữ code + mockup cũ; hỏi designer (§7 D8). Nếu chủ ý → DR mới.
- **Q-H** ✅ Epic E24 riêng.

## 6. Câu hỏi cho BE

Xem `docs/reports/2026-09-02-fe-to-be-asks-adr0143.md` (#1–#10, đã trừ phần
contract-update 02/09 trả lời).

## 7. Design cần chỉnh theo contract BE (prompt cho Claude design)

Sau khi đối chiếu bundle 0209 với `openapi.yaml` + contract-update 02/09, 7 điểm design
không có BE hoặc ngược BE. Prompt gửi Claude design (paste nguyên văn):

```text
Cập nhật design EduPortal (bundle 02/09) theo contract backend đã ship 02/09/2026. Giữ nguyên
design system, token, layout đã chốt; chỉ chỉnh các điểm dưới đây. Ghi vào CHANGELOG.md.

D1. class-hub.jsx — tab "Thời khoá biểu": backend có 2 sổ tách nhau, design mới chỉ vẽ 1.
    (a) Giữ "Sổ chủ nhiệm (theo ngày)" như hiện tại cho GVCN (viết/sửa/gửi duyệt, badge
        Nháp / Chờ BGH duyệt / Đã duyệt / Bị trả lại; GVBM chỉ đọc).
    (b) THÊM trên MỖI TIẾT "— tiết của bạn" của GVBM hai hành động inline, mở drawer/inline form:
        • "Ghi sổ đầu bài tiết": Tên bài dạy (bắt buộc ≤200), Nhận xét (≤2000), Xếp loại tiết
          A/B/C/D (segmented), Số HS vắng (0..200, ghi chú "tham khảo — không thay điểm danh").
          Trạng thái: chưa ghi / đã ghi (không có duyệt). GVCN xem được cả lớp, chỉ đọc.
        • "Chuẩn bị tiết": Ghi chú, chọn Giáo án từ Kế hoạch giảng dạy của tôi (1), Tài liệu =
          danh sách link (tiêu đề + URL, tối đa 20, KHÔNG upload file). Chỉ GVBM của tiết sửa.
    (c) Sửa panel bên phải: bỏ câu "Giáo án & tài liệu không gắn cứng vào tiết dạy" — tài liệu
        chuẩn bị GẮN VÀO TIẾT. Panel = tiết sắp tới của tôi + trạng thái đã chuẩn bị/đã ghi sổ +
        3 lối tắt KHGD / Điểm danh / Sổ đầu bài giữ nguyên.
    (d) Tiết hiển thị tên giáo viên từ dữ liệu TKB (đã có), và nhãn "Đang diễn ra" khi có
        giờ bắt đầu/kết thúc (bell schedule).

D2. course-player.jsx — bỏ 2 tab "Ghi chú" và "Hỏi & Đáp" (backend không có, không kế hoạch).
    Chỉ còn "Tổng quan" (mô tả mục + khung thời gian + tệp/link đính kèm). Cân nhắc bỏ luôn thanh tab.

D3. course-player.jsx + course-items.jsx — nộp bài tập: backend hiện chỉ nhận NỘI DUNG VĂN BẢN
    (≤20.000 ký tự) và/hoặc LINK, chưa nhận tệp. Thiết kế 2 biến thể cho vùng nộp:
    (a) mặc định: ô soạn văn bản + ô "Link bài làm (Drive/Docs…)" + nút "Nộp bài" với xác nhận
        "chỉ nộp 1 lần"; (b) biến thể "có đính kèm" (drop-zone như hiện tại) đánh dấu
        "sau khi backend hỗ trợ". Sau khi nộp: "Đã nộp lúc …"; điểm/nhận xét hiển thị khi
        có (mục chấm điểm backend làm sau).

D4. course-player.jsx — bài giảng (LESSON) backend là nội dung văn bản (không có video).
    Mặc định hiển thị nội dung bài giảng dạng văn bản/rich text; khung video 16:9 chỉ xuất hiện
    khi nội dung có link nhúng được (YouTube/Drive). Không để player trống là trạng thái mặc định.

D5. class-hub.jsx — card lớp GVBM: bỏ "Tiết đã dạy 18/24" (không có nguồn). Thay bằng
    "Vắng hôm nay" + "Bài chờ chấm" (cả hai backend có). Card GVCN giữ Chuyên cần % + Vi phạm chờ.

D6. attendance-portal.jsx — dialog "Xin phép nghỉ": bỏ tùy chọn "theo tiết" (backend chỉ có
    ngày bắt đầu / ngày kết thúc); thêm vùng đính kèm tối đa 3 tệp jpg/png/pdf ≤5 MB mỗi tệp.

D7. course-items.jsx — timeline HỌC SINH: backend KHÔNG trả về mục chưa mở (trừ Kiểm tra).
    Vì vậy với học sinh chỉ mục Kiểm tra mới có trạng thái "Sắp mở" 🔒; các loại khác chỉ có
    Đang mở / Đã đóng. Giáo viên vẫn thấy đủ 3 trạng thái. Nhãn tuần dùng dạng
    "Tuần 20/04 – 26/04" (không có số tuần học), riêng khi có số tuần thì "Tuần 30 · 20/04 – 26/04".

D8. parent-links.jsx — bundle 02/09 đã XOÁ mục "Lịch sử liên kết" (audit trail, DR-023) trong dialog
    chi tiết liên kết PH–HS, nhưng frontend đã build và backend có dữ liệu. Xác nhận: bỏ có chủ ý hay
    sót khi đóng gói? Nếu không chủ ý, khôi phục mục này y như bản trước.

D9. app.jsx / ui.jsx — "Chế độ tối": không dùng filter invert(1) hue-rotate(180deg). Frontend dùng
    bộ token dark thật (tokens.js đã có nền/chữ/border tối). Vẽ dark mode bằng cách đổi giá trị token
    (bg, card, border, text, primaryLight…) — ít nhất cho 3 màn: Class Hub, timeline khoá học, Course Player —
    để kiểm tra contrast AA; ảnh/avatar/màu môn giữ nguyên, không đảo.

Ngoài phạm vi (giữ nguyên, chờ backend): GVCN xem khoá học môn khác chỉ đọc; thêm mục
"Kiểm tra" từ timeline sẽ điều hướng sang tạo bài kiểm tra ở Kho đề rồi tự xuất hiện trên timeline.
```
