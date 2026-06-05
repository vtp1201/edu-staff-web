# Rule: `impeccable` Design-Review Gate (scoped)

`impeccable` (github.com/pbakaus/impeccable, Apache-2.0) là **AI design skill +
CLI**, KHÔNG phải UI library. Dùng để critique/nâng độ hoàn thiện UI + bắt
anti-pattern (decision `0012`).

## Khi nào dùng

Mọi story **chạm UI** (component, page, layout, style) phải qua design-review
gate trước khi đóng — xem `docs/DESIGN_REVIEW.md`. Tối thiểu:

- `/impeccable audit` — bắt anti-pattern (contrast, spacing, motion, typography).
- `/impeccable critique` — đánh giá tổng thể màn/luồng.
- `/impeccable polish` — đề xuất tinh chỉnh (áp dụng có chọn lọc, xem scope).

## Scope CỨNG (quan trọng)

Design system EduPortal là **nguồn chân lý tối thượng**:

- `src/app/tokens.css` + `.claude/rules/design-system.md` + handoff (decision
  `0011`) **luôn thắng** khi impeccable gợi ý ngược lại.
- impeccable **được phép**: bắt lỗi a11y/contrast/focus/motion, spacing lộn xộn,
  hierarchy yếu, UX writing kém, state thiếu (empty/error/loading).
- impeccable **KHÔNG được**: đổi palette/token, đổi font, đổi layout đã chốt theo
  handoff, "redesign" cho khác đi. Nó chống "generic AI look", nhưng look của ta
  là CÓ CHỦ ĐÍCH theo handoff — không phải slop.
- Khi gợi ý của impeccable mâu thuẫn design system → ghi lại, giữ design system,
  chỉ nâng decision nếu muốn đổi chính design system.

## Cài đặt (đã thực hiện — story E07.1, 2026-06-06)

- Cài bằng `impeccable skills install` (target `.claude`) → skill ở
  `.claude/skills/impeccable/` (commit vào repo, chia sẻ cả team).
- **Version đã cài**: CLI `2.3.2`, skill bundle `3.5.0`. Update bằng
  `npx impeccable@latest skills update`; re-pin version ở đây khi update.
- Là skill Claude Code (`user-invocable`), gọi qua `/impeccable …`. KHÔNG nằm
  trong runtime bundle của app.
- Chưa chạy `/impeccable init` (tạo DESIGN.md + scan) — follow-up có chủ đích,
  cần cân nhắc để DESIGN.md không trùng/đè design system đã chốt (scope decision 0012).

## Liên quan

- `.claude/rules/design-system.md`, `.claude/rules/accessibility.md`
- `docs/DESIGN_REVIEW.md`, decision `0012`.
