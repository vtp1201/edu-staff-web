# 0012 Adopt `impeccable` as a Scoped Design-Review Gate

Date: 2026-06-06

## Status

Accepted

## Context

Muốn UI thân thiện/hoàn thiện hơn cho môi trường giáo dục. `impeccable`
(github.com/pbakaus/impeccable, Apache-2.0) **không phải UI component library** —
nó là **AI design skill + CLI**: 7 domain reference (typography, color, motion,
spatial, interaction, responsive, UX writing), 23 lệnh `/impeccable
audit|critique|polish|animate|typeset…`, 27 deterministic anti-pattern rule +
LLM critique. Mục tiêu: chống "AI design slop" (Inter font, gradient tím-xanh,
nested card lặp lại).

Nghịch lý cần xử lý: impeccable chống "generic shadcn look", nhưng dự án ta CÓ
một design system shadcn cụ thể phải match pixel (decision 0011). Nếu để
impeccable tự do "polish", nó có thể đi ngược design system đã chốt.

## Decision

Adopt impeccable như **design-review gate có giới hạn**:

- **Cài** như skill cho Claude Code (`npx impeccable skills install`).
- **Wiring vào harness**: mọi story chạm UI phải qua design-review gate
  (`docs/DESIGN_REVIEW.md`) — chạy `impeccable audit`/`critique` trên thay đổi UI
  trước khi đóng story.
- **Scope cứng**: design system EduPortal (`.claude/rules/design-system.md` +
  `tokens.css`) là **nguồn chân lý tối thượng**. impeccable dùng để bắt
  anti-pattern (a11y, contrast, spacing lộn xộn, motion hại, copy yếu) và nâng độ
  hoàn thiện **TRONG khuôn khổ** design system — KHÔNG được đổi token, palette,
  hay layout đã chốt theo handoff. Conflict → design system thắng.

## Alternatives Considered

1. Chỉ cài skill, dùng ad-hoc — bỏ: không đảm bảo nhất quán; dễ quên.
2. Không cài, trích nguyên tắc thủ công — bỏ: mất 23 lệnh + anti-pattern engine
   cập nhật theo upstream.

## Consequences

Positive:

- Mọi UI có một bước critique khách quan, bắt a11y/contrast/motion sớm.
- Bổ trợ trực tiếp accessibility-first (decision 0013).

Tradeoffs:

- Thêm một dependency/skill ngoài; cần version-pin và review khi update.
- Phải kỷ luật giữ scope để không xung đột design system.

## Follow-Up

- ✅ `.claude/rules/impeccable.md` (cách dùng + scope).
- ✅ `docs/DESIGN_REVIEW.md` (gate tích hợp impeccable + a11y + design-system).
- Pin version impeccable; ghi vào rule khi cài.
- Story: E07 Design System Foundation (wiring gate).
