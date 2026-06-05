# Tailwind v4 + shadcn/ui Rules

## Config qua CSS, không phải JS
- Tailwind v4 dùng `@theme` directive trong `src/app/globals.css`
- KHÔNG tạo/sửa `tailwind.config.ts` — file này không tồn tại trong v4
- Theme tokens (color, spacing, radius, font) define trong `globals.css`:
```css
  @theme inline {
    --color-primary: oklch(...);
    --radius-lg: 0.75rem;
  }
```
- Dark mode: dùng CSS variables thay đổi qua `[data-theme="dark"]`,
  không hardcode `dark:bg-slate-900`

## Color usage
- LUÔN dùng semantic token: `bg-background`, `text-foreground`, `bg-muted`,
  `text-muted-foreground`, `bg-primary`, `border-border`
- KHÔNG dùng raw color: `bg-slate-100`, `text-gray-500`, `bg-[#fff]`
- Nếu cần color không có trong theme → thêm vào `@theme` block trước,
  rồi dùng qua semantic name

## shadcn/ui flow
- Component primitive: `bun ui:add <name>` (KHÔNG copy-paste từ shadcn web)
  → script tự tạo folder, `index.ts` re-export, `.stories.tsx`
- Customize variant: edit trực tiếp file trong `src/components/ui/<name>/`
  vì shadcn theo philosophy "you own the code"
- Composed component: tạo trong `src/components/shared/` hoặc
  `features/<x>/presentation/`, KHÔNG sửa file primitive

## Class ordering (Biome auto-sort)
Biome có rule `useSortedClasses` — sau khi viết xong cứ chạy `bun lint:fix`,
Biome tự sort. Không phải tự sort tay.

## Tailwind extension auto-fix
Khi extension VS Code (Tailwind IntelliSense) báo:
- `pl-2 pr-2 pt-1 pb-1` → `px-2 py-1`
- `w-full h-full` → `size-full`
- `flex flex-row` → `flex` (row mặc định)
- `text-[16px]` → `text-base` (nếu match token)
→ APPLY luôn không hỏi.

## Anti-patterns
- KHÔNG `style={{ ... }}` inline trừ giá trị động (computed width, transform)
- KHÔNG `clsx`/`cn` chỉ để nối 2 string cố định — viết thẳng class
- DÙNG `cn()` từ `@/shared/utils` khi có conditional class
- KHÔNG mix `tw-` prefix vào project (project không dùng prefix)

## cn() pattern
```tsx
import { cn } from '@/shared/utils'

<div className={cn(
  'flex items-center gap-2 px-4 py-2',     // base
  'text-sm font-medium text-foreground',   // typography
  isActive && 'bg-primary text-primary-foreground',  // conditional
  className                                 // override prop
)} />
```