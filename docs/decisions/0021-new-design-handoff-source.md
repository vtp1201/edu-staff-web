# 0021 New Design Handoff as Canonical Source (design_handoff_eduportal2_1206)

Date: 2026-06-12

## Status

Accepted

## Context

Có hai folder design handoff:

1. `design_handoff_eduportal_2` — bản cũ, chứa: `login.jsx`, `teacher.jsx`,
   `student.jsx`, `profile.jsx`, `classops.jsx`, `discipline.jsx`, `exam.jsx`,
   `messaging.jsx`, `ui.jsx`, `tokens.js`, `app.jsx`.

2. `design_handoff_eduportal2_1206` — bản mới (12/06), bổ sung thêm:
   - `calendar.jsx` — cấu hình năm học / học kỳ (US-042)
   - `roster.jsx` — danh sách lớp học / enroll học sinh (US-043)
   - `school-setup.jsx` — thiết lập trường (grade range + settings) (US-049, ADR 0035)
   - `subject-detail.jsx` — chi tiết môn học master (US-048, ADR 0036)
   - `subject-parents.jsx` — bộ môn / tổ chuyên môn
   - `subjects-data.jsx` — seed data cho subject catalogue
   - `subjects-dialogs.jsx` — dialog/sheet cho subject catalogue
   - `subjects.jsx` — subject catalogue editor
   - `timetable.jsx` — timetable builder với conflict detection (US-045)

   Design đã hoàn thành đến bước NEW-02 (Grade Scale & Assessment Scheme Config
   / grade-scoped subject selector).

   Bản mới tham chiếu các ADR của BE team (ADR 0029, 0035, 0036) và các US
   (US-042, US-043, US-045, US-048, US-049) — cho thấy design đã align với
   backend model.

## Decision

1. **Bản mới (`design_handoff_eduportal2_1206`) là design source chính thức**
   thay thế bản cũ.

2. **`design_src/` được commit in-tree vào repo `edu-staff-web`** (canonical,
   version-controlled). Nguồn `.jsx` + `tokens.js` được commit; `EduPortal.html`
   bị `.gitignore` (preview cục bộ, không cần trong CI/agent workflow).

   `.gitignore` entry thêm:
   ```
   design_src/edu/EduPortal.html
   ```

   Agent FE đọc file `.jsx` trực tiếp từ `design_src/edu/<file>.jsx` trong
   working tree — không cần path ngoài repo, không cần Downloads.

3. **Preview interactive**: mở `EduPortal.html` từ máy local (file cục bộ không
   được commit). Agent FE chỉ cần đọc file `.jsx` để lấy layout/token/logic spec.

4. **Quy tắc cho agent FE**: khi implement một màn hình, agent **phải** `Read`
   file `.jsx` tương ứng trong `design_src/edu/` làm visual reference pixel-accurate.
   Không dựa vào description text trong story packet làm spec pixel-level.

5. **Bản cũ** (`design_handoff_eduportal_2`) giữ lại tại vị trí Downloads; không
   xóa nhưng không còn là source of truth.

## Consequences

- `docs/product/screens.md` cập nhật cột "Design file" trỏ đến file `.jsx` tương
  ứng trong `design_src/edu/` (path in-tree, không phải Downloads).
- Các story packet E12 và trở đi phải reference file design cụ thể trong
  `Design Notes` bằng path in-tree `design_src/edu/<file>.jsx`.
- Agent FE phải `Read design_src/edu/<file>.jsx` trước khi implement UI.
- Design screens chưa có file `.jsx` (ví dụ `/admin/assessment` — NEW-02) được
  track qua `docs/design-requests/` cho đến khi designer build xong.

## Related

- decision `0011` — Legacy handoff as visual spec (superseded một phần bởi
  decision này cho các màn hình mới)
- US-042, US-043, US-045, US-048, US-049 (BE stories đã có ADR, design FE đã align)
- Epic E12 Admin Core Setup
