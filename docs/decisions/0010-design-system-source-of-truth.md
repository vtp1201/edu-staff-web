# 0010 Design System Source of Truth & Token Relocation

Date: 2026-06-06

## Status

Accepted

## Context

Harness install (`install-harness.sh --override --yes`) **đã xóa toàn bộ
`docs/design/`** (`design-system.md`, `tokens.css`, `design.md`,
`design-spec.jsonc`) — backup ở `.harness-backup/20260605214808/docs/design/`.

Hậu quả runtime: `src/app/globals.css` vẫn `@import "../../docs/design/tokens.css"`
(file đã xóa), và `:root`/`@theme` đang `var(--edu-primary)`, `var(--edu-bg)`…
mà các `--edu-*` chỉ định nghĩa trong file đã xóa → **hệ màu của app vỡ ở
runtime**. `.claude/CLAUDE.md` cũng `@`-reference 4 file design đã mất.

Harness cố tình bỏ `docs/design/`; tái tạo lại y nguyên sẽ đi ngược convention
harness. Cần định lại nơi đặt design system cho đúng phân lớp (runtime vs
docs vs enforceable rule).

## Decision

Tách design system theo đúng vai trò, **không** dùng lại `docs/design/`:

| Vai trò | Vị trí mới |
| --- | --- |
| **Token runtime** (source of truth runtime) | `src/app/tokens.css` (import bằng `./tokens.css` trong globals.css) |
| **Rule enforceable** (Claude phải tuân) | `.claude/rules/design-system.md` |
| **Product contract** (đọc hiểu) | `docs/product/design-system.md` |
| **Screen inventory** | `docs/product/screens.md` |

Đã thực hiện trong decision này: khôi phục token (giá trị từ backup) vào
`src/app/tokens.css`, sửa import globals.css, cập nhật `.claude/CLAUDE.md` trỏ
sang vị trí mới.

Quy tắc giữ nguyên: token là source of truth; chỉ dùng semantic token đã define;
token mới phải thêm vào `tokens.css` trước rồi mới dùng (xem
`.claude/rules/tailwind-v4.md`).

## Alternatives Considered

1. Tái tạo `docs/design/` y như cũ — bỏ: đi ngược harness, lại dễ bị `--override`
   xóa lần nữa.
2. Nhúng token thẳng vào `globals.css` — bỏ: mất file token tách biệt, khó
   per-tenant override + khó test.

## Consequences

Positive:

- Runtime token nằm trong `src/` (đúng chỗ của code chạy), không phụ thuộc thư
  mục docs dễ bị wipe.
- Phân tách rule (enforce) vs contract (đọc) vs runtime (chạy) rõ ràng.

Tradeoffs:

- `.claude/CLAUDE.md` và mọi tham chiếu cũ phải cập nhật một lần.

## Follow-Up

- ✅ `src/app/tokens.css` + fix import globals.css.
- ✅ `.claude/rules/design-system.md`, `docs/product/design-system.md`,
  `docs/product/screens.md`.
- ✅ Cập nhật `.claude/CLAUDE.md` (mục Design System) + cross-link.
- Cân nhắc migrate hex → oklch (Tailwind v4 native) sau — ghi decision riêng nếu
  làm (PAGE_PLAN.md đã có sẵn mapping oklch).
- Story: E07 Design System Foundation.
