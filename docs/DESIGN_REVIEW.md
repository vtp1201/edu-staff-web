# Design Review Gate

Mọi story **chạm UI** (component, page, layout, style, copy hiển thị) phải qua
gate này trước khi đóng. Bổ sung cho `docs/FEATURE_INTAKE.md` (lane vẫn theo
risk checklist); gate này là điều kiện "done" về mặt design.

## Khi nào áp dụng

Áp dụng khi diff chạm: `src/components/**`, `features/**/presentation/**`,
`src/app/**/*.tsx`, `globals.css`/`tokens.css`, hoặc copy người dùng thấy.

Bỏ qua: thay đổi thuần domain/infrastructure/bootstrap không ảnh hưởng UI.

## Checklist (theo thứ tự)

### 1. Design system conformance (`.claude/rules/design-system.md`)
- [ ] Chỉ dùng semantic token / `edu-*`; KHÔNG raw color.
- [ ] Typography, spacing, radius, shadow theo scale đã chốt.
- [ ] Tái dùng component pattern (StatCard, Badge, ProgressBar, Sidebar…) — không tự chế lại.
- [ ] Role chỉ khác qua color accent (không fork tông — decision `0013`).
- [ ] Khớp screen tương ứng trong `docs/product/screens.md` (decision `0011`).

### 2. Accessibility (`.claude/rules/accessibility.md`, decision `0013`)
- [ ] Contrast WCAG AA; status không chỉ bằng màu.
- [ ] Keyboard-operable; focus ring rõ; ARIA của Radix giữ nguyên.
- [ ] Target ≥44px mobile; input có label; icon-only có `aria-label`.
- [ ] Animation gate sau `prefers-reduced-motion`.

### 3. impeccable critique (`.claude/rules/impeccable.md`, decision `0012`)
- [ ] Chạy `/impeccable audit` trên thay đổi UI → xử lý anti-pattern.
- [ ] (Màn mới/phức tạp) chạy `/impeccable critique`.
- [ ] Áp dụng `polish` có chọn lọc **trong scope** — design system thắng nếu xung đột.

### 4. States & responsive
- [ ] Có đủ state: loading / empty / error / success (empty/error thân thiện).
- [ ] Không vỡ ở 320px; kiểm tra dark mode.
- [ ] (Khuyến nghị) Storybook story có các state để soi.

## Output gate

Khi xong, story ghi vào `## Evidence`:

```text
Design review: pass
- design-system: conform (token/typography/component OK)
- a11y: WCAG AA OK; keyboard OK; reduced-motion OK
- impeccable audit: <N> finding, đã xử lý / lý do giữ
- states: loading/empty/error/success OK; responsive 320px OK
```

Conflict giữa impeccable và design system → giữ design system, ghi lý do; chỉ
nâng decision nếu muốn đổi chính design system.
