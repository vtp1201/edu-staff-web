# 0011 Legacy Handoff = Visual/UX Spec, Not Architecture

Date: 2026-06-06

## Status

Accepted

## Context

Có một design handoff đầy đủ (`/Users/.../Downloads/design_handoff_eduportal_2`):
tokens, typography, spacing, shadow, component spec, interaction spec, ~30
screen, file Pencil (`untitled.pen`), HTML prototype. Token của nó **khớp** với
`--edu-*` hiện có — code hiện tại được derive từ chính nó.

Nhưng handoff **giả định stack khác** dự án thật:

| Handoff giả định | Dự án thật (đã chốt) |
| --- | --- |
| NextAuth.js (Google/FB/VneID) | Cookie httpOnly + Server Actions, IAM REST (decision auth) |
| Prisma + `tenant_id` per table | Web không có DB; REST API riêng (decision 0008) |
| Zustand / useState cho remote | TanStack Query v5 |
| Subdomain-only tenancy | Path-first, hybrid-ready (decision 0007) |
| React `useState` data | Clean Architecture per-feature |

## Decision

Coi legacy handoff là **spec hình ảnh / UX**, **không** phải spec kiến trúc:

- **Tuân theo (pixel-accurate)**: màu, spacing, typography, border-radius,
  shadow, component layout, hover/interaction state, screen inventory, flow UX.
- **Bỏ qua / thay bằng quyết định của ta**: auth, data layer, state management,
  tenancy mechanism, folder structure. Clean Architecture + decisions
  0007/0008/0009 + CLAUDE.md **luôn thắng** khi xung đột.
- Khi tham chiếu một màn từ handoff trong story, map lại sang route + kiến trúc
  thật (xem `docs/product/screens.md`).

## Alternatives Considered

1. Theo handoff cả kiến trúc — bỏ: phá vỡ các decision đã chốt, sai stack.
2. Chỉ tham khảo lỏng, không pixel-exact — bỏ: mất sự nhất quán/độ hoàn thiện
   mà handoff đã đặc tả kỹ.

## Consequences

Positive:

- Tận dụng tối đa một design hoàn chỉnh mà không nhập nhằng kiến trúc.
- Tiêu chí "đúng design" rõ ràng cho design-review gate (decision 0012).

Tradeoffs:

- Mỗi screen phải "dịch" UX→kiến trúc của ta; cần `screens.md` làm cầu nối.

## Follow-Up

- ✅ `docs/product/screens.md` map ~30 screen → route + feature (Clean Arch).
- File `untitled.pen` mở được bằng Pencil MCP khi cần chi tiết pixel.
- Mọi UI story link tới screen tương ứng trong `screens.md`.
