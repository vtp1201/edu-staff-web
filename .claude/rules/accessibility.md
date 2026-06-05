# Rule: Accessibility-First (WCAG 2.1 AA)

Baseline bắt buộc cho mọi UI (decision `0013`). Người dùng đa lứa tuổi + thiết bị
trường học yếu → a11y là tiêu chí "done", không phải tùy chọn.

## Contrast

- Text thường ≥ **4.5:1**; text lớn (≥18px hoặc ≥14px bold) & UI/icon ≥ **3:1**.
- Không đặt text trắng trên `--edu-warning` (vàng) → dùng `--edu-warning-foreground`.
- Status không CHỈ truyền bằng màu → kèm icon/label (mù màu).

## Keyboard & focus

- Mọi tương tác (button, link, toggle, tab, dialog, menu) thao tác được bằng
  bàn phím; tab order theo thứ tự đọc.
- Focus ring LUÔN hiển thị (dùng `--ring`); KHÔNG `outline: none` mà không thay
  bằng focus style rõ.
- Giữ semantics của Radix/shadcn — không phá ARIA/role khi customize.

## Target & layout

- Touch target ≥ **44×44px** trên mobile.
- Responsive: không vỡ ở 320px width; không khóa zoom.
- Form: mọi input có `<label>` liên kết; lỗi mô tả bằng text (không chỉ màu đỏ);
  `aria-invalid` + `aria-describedby` cho field lỗi.

## Hình ảnh & icon

- `<img>` có `alt` ý nghĩa (alt="" nếu trang trí).
- Icon-only button có `aria-label` tiếng Việt rõ.

## Motion (motion-safe)

- Mọi animation gate sau `@media (prefers-reduced-motion: reduce)` → giảm/tắt.
- Chỉ dùng micro-interaction trong design system (hover lift, progress fill,
  toast, collapse, exam timer). KHÔNG animation trang trí ngoài handoff.
- Không auto-play nội dung chuyển động/âm thanh.

## Ngôn ngữ & nội dung

- `<html lang>` theo locale (`vi`/`en`).
- Microcopy rõ, không viết tắt khó hiểu; thông báo lỗi hướng dẫn cách sửa.

## Kiểm chứng

- Chạy `impeccable audit` (decision `0012`) để bắt contrast/motion/focus.
- Test keyboard-only thủ công cho flow chính.
- Story Storybook nên có state focus/disabled/error để soi.
