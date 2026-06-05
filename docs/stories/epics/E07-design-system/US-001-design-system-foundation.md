# US-E07.1 Design System Foundation

## Status

implemented

## Lane

normal

## Product Contract

Design system của EduPortal phải có nguồn chân lý rõ ràng, chạy được ở runtime,
accessibility-first, và có gate review — sau khi harness install xóa
`docs/design/` làm vỡ hệ token (decisions `0010`/`0011`/`0012`/`0013`).

## Relevant Product Docs

- `docs/product/design-system.md`, `docs/product/screens.md`
- `.claude/rules/design-system.md`, `.claude/rules/accessibility.md`, `.claude/rules/impeccable.md`
- `docs/DESIGN_REVIEW.md`
- Decisions `0010`, `0011`, `0012`, `0013`

## Acceptance Criteria

- [x] Token runtime tồn tại + import hợp lệ (`src/app/tokens.css`, globals.css
  `@import "./tokens.css"`). Hết import gãy `docs/design/tokens.css`.
- [x] Rule design-system / accessibility / impeccable + design-review gate được tạo.
- [x] `.claude/CLAUDE.md` trỏ đúng vị trí mới (hết `@docs/design/*` đã xóa).
- [x] `globals.css` thêm guard `@media (prefers-reduced-motion: reduce)` cho transition/animation.
- [x] Storybook: story "Design System/Foundations" (Colors/Typography/RadiusAndShadow).
- [x] Cài + pin `impeccable` skill vào `.claude/skills/impeccable` (CLI 2.3.2, bundle 3.5.0).
- [x] `bun build` xanh với token mới.

## Design Notes

- Runtime: `tokens.css` (:root `--edu-*`) → map `@theme` trong `globals.css` →
  shadcn semantic vars. Per-tenant override `--edu-primary` (decision 0007).
- A11y: contrast AA, warning→text tối, motion gate reduced-motion.
- UI surfaces: nền tảng cho mọi epic UI (E08–E11).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | — (chủ yếu config/CSS) |
| Integration | — |
| E2E | — |
| Platform | `bun build` xanh; `bun dev` render đúng hệ màu; Storybook build |
| Release | `bun lint` |

## Harness Delta

- ✅ Decisions 0010–0013; rules design-system/accessibility/impeccable;
  `docs/DESIGN_REVIEW.md`; product docs design-system + screens; CLAUDE.md update.
- Wiring design-review gate thành thói quen cho mọi story UI sau.

## Evidence (2026-06-06)

- `src/app/tokens.css` tạo từ giá trị backup; `globals.css` import `./tokens.css`.
  `grep docs/design src/` sạch (chỉ còn 1 comment provenance).
- Reduced-motion guard thêm vào `globals.css` (biome-ignore có lý do cho
  `!important` của a11y reset). `bunx biome check` sạch.
- Storybook story `src/components/design-system/foundations.stories.tsx`
  (Colors/Typography/RadiusAndShadow) — type-check qua build. (Đặt ngoài
  `/src/stories` vì thư mục đó bị gitignore — SB boilerplate.)
- `impeccable` cài vào `.claude/skills/impeccable` (CLI 2.3.2, bundle 3.5.0);
  xuất hiện trong danh sách skill (`/impeccable`).
- `bun run build`: ✓ Compiled successfully, TypeScript pass, static pages
  generated (4/4), mọi route OK → hệ token render đúng, hết import gãy.
