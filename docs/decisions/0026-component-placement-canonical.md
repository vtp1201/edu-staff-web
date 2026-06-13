# 0026 Component Placement — Canonical Home, No Duplication

Date: 2026-06-13

## Status

Accepted

## Context

Nhiều màn dùng chung component đã được custom (custom là **đúng yêu cầu design**).
Trước rule này, nơi đặt component không thống nhất → đã phát sinh trùng lặp:

- **3 biến thể "stat card"** lệch API: `components/shared/stat-card/` (chuẩn),
  `Stat` đẻ riêng trong `features/attendance/.../attendance-summary-card.tsx`,
  `ChildStat` đẻ riêng trong `features/parent/.../parent-dashboard.tsx`.
- Wrapper `Field` (Input+Label) nằm lẻ trong `profile-screen`.
- Status-badge styling (`bg-primary/12 text-primary`, map `STATUS_TONE`) lặp inline
  ở teacher / profile / calendar — không có component dùng chung.

Rule cũ (`design-system.md`) chỉ nói *"Composed component để `components/shared/`
hoặc `features/<x>/presentation/`"* — quá mơ hồ: không nói **khi nào phải gom về
chung** và **cấm trùng lặp**. Hệ quả: sửa một thay đổi design phải sửa nhiều chỗ,
dễ drift và lỗi a11y/spec.

## Decision

Một component giao diện chỉ tồn tại **một nơi chân lý**, đặt theo **bản chất** —
chi tiết enforceable ở `.claude/rules/component-organization.md`:

1. **Variant/style của một primitive** (đúng design) → sửa thẳng trong
   `components/ui/<name>/` (shadcn "you own the code"), thêm `variant`, không tạo
   wrapper trong feature.
2. **Composed component dùng ≥2 screen** → `components/shared/<name>/` (nhà chân lý).
3. **Composed chỉ 1 screen (tạm)** → `features/<x>/presentation/` nhưng **promote**
   (di chuyển, không copy) sang `shared/` ngay khi screen thứ 2 cần.

Cấm: hai bản cùng pattern ở hai nơi; copy-paste để tái dùng; fork component mới khi
chỉ cần thêm prop/variant. `fe-component-architect` search trước khi đề xuất;
`fe-tech-lead-reviewer` chặn (Revision Required) khi phát hiện vi phạm.

## Alternatives Considered

1. **Gom mọi version custom (kể cả composed) về `components/ui/`** đúng như đề xuất
   ban đầu của user (cạnh component gốc). Đơn giản "một chỗ tìm" nhưng phá ranh giới
   "ui/ = primitive thuần" và trộn business logic cross-feature vào `ui/`. Bỏ.
2. **Giữ nguyên rule mơ hồ + dựa review thủ công.** Đã chứng minh không đủ (3 stat
   card drift). Bỏ.

## Consequences

Positive:

- Một thay đổi design = sửa một nơi; hết drift giữa các biến thể.
- Cây quyết định rõ → architect/engineer/reviewer áp chung một chuẩn.
- `ui/` giữ sạch primitive; `shared/` là catalog component dùng chung tra được.

Tradeoffs:

- Có chi phí "promote" (di chuyển feature-local → shared) khi phát sinh screen thứ 2.
- Cần dọn nợ hiện hữu (hợp nhất `Stat`/`ChildStat` về `StatCard`; trích `StatusBadge`)
  như follow-up.

## Follow-Up

- Hợp nhất `Stat` (attendance) + `ChildStat` (parent) về `components/shared/stat-card`
  (thêm variant `compact`/`mini` nếu cần) — story dọn nợ.
- Trích status-badge styling lặp inline thành `components/shared/status-badge`.
- Cân nhắc lint/grep check phát hiện wrapper primitive đẻ trong `features/*`.
