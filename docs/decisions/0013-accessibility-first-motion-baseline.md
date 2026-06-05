# 0013 Accessibility-First Baseline + Motion-Safe Delight

Date: 2026-06-06

## Status

Accepted

## Context

"Thân thiện với người dùng + môi trường giáo dục" được chốt **ưu tiên
accessibility-first**. Người dùng đa lứa tuổi (học sinh, phụ huynh, giáo viên,
hiệu trưởng), thiết bị trường học thường yếu. Đã cân nhắc rủi ro của "delight &
role tone": animation hại a11y/perf + gây xao nhãng; tông theo role gây phân
mảnh design system và rối với user đa-role.

## Decision

### A. Accessibility-first (bắt buộc — baseline)

- **Contrast** đạt WCAG 2.1 AA (≥4.5:1 text thường, ≥3:1 text lớn/UI). Lưu ý
  `--edu-warning` (#FFAE1F) dùng `--edu-warning-foreground` (#2A3547), không phải
  trắng.
- **Touch target** ≥ 44×44px (mobile), focus ring rõ (`--ring`), không bỏ outline.
- **Keyboard**: mọi tương tác thao tác được bằng bàn phím; tab order hợp lý;
  Radix/shadcn giữ semantics, không phá ARIA.
- **Ngôn ngữ/label**: input có label; icon-only button có `aria-label`; ảnh có alt.
- **Tùy chọn font dễ đọc** cân nhắc cho học sinh (follow-up).

### B. Motion-safe delight (giới hạn)

- **Chỉ** dùng micro-interaction đã có trong handoff: hover lift, progress fill
  0.6s, success toast 3s, sidebar collapse 0.25s, exam timer đổi màu.
- **Tất cả** animation gate sau `@media (prefers-reduced-motion: reduce)` → giảm
  hoặc tắt. Không thêm animation trang trí ngoài handoff.

### C. Role differentiation = chỉ color accent

- Phân biệt role **chỉ** qua color token (`--edu-role-*`). **KHÔNG** fork
  tông/voice/layout/animation theo role → giữ một design system thống nhất,
  tránh rối cho user đa-role.

## Alternatives Considered

1. Delight đầy đủ + tông riêng theo role — bỏ: rủi ro a11y/perf/phân mảnh (phân
   tích trong Context).
2. Bỏ hẳn animation — bỏ: handoff có micro-interaction giúp UX; gate
   reduced-motion là đủ an toàn.

## Consequences

Positive:

- UI dùng được cho mọi lứa tuổi/thiết bị; nhất quán; an toàn motion.
- Tiêu chí đo được cho design-review gate (decision 0012).

Tradeoffs:

- Một số "vui" bị cắt; đổi lại tính nhất quán + an toàn.

## Follow-Up

- ✅ `.claude/rules/accessibility.md` (baseline enforceable).
- Thêm token/`prefers-reduced-motion` guard vào `globals.css` khi build component.
- Cân nhắc tùy chọn font dễ đọc cho học sinh — story riêng nếu làm.
- impeccable `audit` kiểm a11y/contrast/motion (decision 0012).
