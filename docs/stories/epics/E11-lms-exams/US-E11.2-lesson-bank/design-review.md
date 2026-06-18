# US-E11.2 Lesson Bank — Design Review Gate

> Gate theo `docs/DESIGN_REVIEW.md` + `.claude/rules/impeccable.md`. Hoàn tất phần
> còn lại của pipeline sau khi phiên `fe-lead` bị giới hạn (session limit) — i18n
> namespace, app route, Storybook stories, lint a11y fixes, packet docs.

## Verdict: APPROVED

### Tokens-only
- Không raw color; file-type / visibility badge dùng token semantic sẵn có.
- impeccable PostToolUse hook quét mọi file presentation: **No anti-patterns**.

### WCAG 2.1 AA
- Upload drop-zone: `<button type="button">` thật → native keyboard (Enter/Space) +
  focus ring (`focus-visible:ring-ring`), thay cho div role=button.
- Toggle group: `role="group"` + `aria-label` (toolbar pattern, có chủ đích).
- Skeleton: `role="status"` + `sr-only` "Đang tải...", key ổn định.
- Form: Label `htmlFor/id`, `aria-required`, `aria-invalid` + `aria-describedby`,
  lỗi `role="alert"` (mô tả bằng text, không chỉ màu).
- Sheet/drawer giữ focus-trap của Radix (không phá ARIA).

### State coverage (Storybook)
`Populated` (grid), `EmptyTeacher` (empty), `NoMatch` (filtered empty), 
`PrincipalReadOnly` (no upload/edit) — đều có interaction assertions.

### Lint / a11y findings xử lý
- `lint/a11y/useSemanticElements` (drop-zone) → sửa thật thành `<button>`.
- `lint/a11y/useSemanticElements` (toggle group) → biome-ignore có lý do (toolbar group).
- `lint/suspicious/noArrayIndexKey` (skeleton) → dùng key ổn định, bỏ index key.

## Proof
- `bunx tsc --noEmit`: 0 lỗi.
- `bun vitest run`: 516/516 pass (31 lesson-bank: 20 unit + 7 mapper/repo integ +
  4 Storybook; phần còn lại là suite hiện có).
- `bun run build`: green; route `ƒ /[locale]/t/[tenant]/teacher/lesson-bank`.
- biome: clean.

## Open items (follow-up, không chặn)
- Sidebar nav link + principal route (shell scope).
- Real lms wiring + file storage/upload progress khi service lên.
- TanStack Query + cursor pagination khi cần cache xuyên screen.
