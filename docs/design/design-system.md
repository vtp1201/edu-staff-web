# EduPortal — Design System

---

## Font

**Plus Jakarta Sans** — add via `next/font/google`.

```tsx
import { Plus_Jakarta_Sans } from 'next/font/google'
const font = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400','500','600','700','800'] })
```

---

## Typography Scale

| Token | Size | Weight | Color | Usage |
|-------|------|--------|-------|-------|
| `page-title` | 22px / `text-2xl` | 800 | `textPrimary` | Page headings |
| `section-title` | 18px | 800 | `textPrimary` | Header page title |
| `card-title` | 15px | 700 | `textPrimary` | Card headings |
| `body` | 13–14px / `text-sm` | 400–500 | `textPrimary` | Body copy |
| `label` | 12px | 700 | `textMuted` | UPPERCASE labels + tracking |
| `caption` | 11px | 400 | `textMuted` | Hints, timestamps |
| `stat-value` | 26px | 800 | `textPrimary` | Stat cards |

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#5D87FF` | Brand, buttons, active state, links |
| `primaryLight` | `#ECF2FF` | Primary tinted backgrounds |
| `primaryDark` | `#4570EA` | Primary hover/pressed |
| `success` | `#13DEB9` | Positive status, Principal role |
| `successLight` | `#E6FFFA` | Success tinted backgrounds |
| `warning` | `#FFAE1F` | Caution, Student role |
| `warningLight` | `#FEF5E5` | Warning tinted backgrounds |
| `error` | `#FA896B` | Errors, overdue, danger |
| `errorLight` | `#FFF5F2` | Error tinted backgrounds |
| `info` | `#539BFF` | Informational |
| `infoLight` | `#EBF3FE` | Info tinted backgrounds |
| `purple` | `#7B5EA7` | Parent role accent |
| `purpleLight` | `#F0EBF9` | Purple tinted backgrounds |
| `teal` | `#00B8A9` | Supplementary accent |
| `tealLight` | `#E0F7F5` | Teal tinted backgrounds |
| `textPrimary` | `#2A3547` | Primary text |
| `textSecondary` | `#5A6A85` | Secondary text |
| `textMuted` | `#8898A9` | Muted/hint text |
| `bg` | `#F5F7FA` | Page background |
| `card` | `#FFFFFF` | Card surfaces |
| `border` | `#E5EAF2` | Borders, dividers |
| `successForeground` | `#FFFFFF` | Text on `bg-edu-success` |
| `warningForeground` | `#2A3547` | Text on `bg-edu-warning` (dark vì warning vàng) |
| `errorForeground` | `#FFFFFF` | Text on `bg-edu-error` |

### Role → Color Mapping

```ts
teacher:   '#5D87FF'  // primary
principal: '#13DEB9'  // success
student:   '#FFAE1F'  // warning
parent:    '#7B5EA7'  // purple
```

### Score / Performance Colors

```ts
score >= 8           → success (#13DEB9)
score < 5            → error   (#FA896B)
otherwise            → textPrimary (#2A3547)

gpa >= 8.5  "Giỏi"  → success
gpa >= 7.0  "Khá"   → primary
gpa >= 5.0  "TB"    → warning
gpa <  5.0  "Yếu"  → error
```

---

## Spacing & Sizing

| Token | Value |
|-------|-------|
| Sidebar width | 260px |
| Sidebar collapsed | 72px |
| Header height | 64px |
| Card padding | 20–24px |
| Card gap | 16px |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `btn` | 8px | Buttons |
| `card` | 12px | Cards, icon boxes |
| `lg` | 16px | Role icon box |
| `badge` | 20px (full) | Badges |
| `input` | 10px | OTP inputs |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-card` | `0 2px 12px rgba(0,0,0,0.04)` | Default card |
| `shadow-card-hover` | `0 8px 28px rgba(0,0,0,0.10)` | Card hover |
| `shadow-toggle` | `0 2px 8px rgba(0,0,0,0.08)` | Sidebar toggle button |

---

## Components

### `<StatCard />`

```tsx
interface StatCardProps {
  icon: LucideIcon
  iconColor: string
  label: string
  value: string | number
  trend?: number        // positive = up
  trendLabel?: string
}
// Layout: white card, border, shadow-card, p-5
// Icon box: 52×52, rounded-xl, bg = iconColor + '18'
// Value: 26px fw-800
// Trend: ↑ green / ↓ red, 12px fw-700
```

### `<Badge />`

```tsx
// padding: 3px 10px, rounded-full, 11px fw-600
// bg default: color + '18'
<span style={{ color, background: bg ?? color + '18' }}>...</span>
```

### `<ProgressBar />`

```tsx
// Track: #E5EAF2, height (default 6px), rounded-full
// Fill: color prop, transition: width 0.6s ease
// Use shadcn <Progress> with --color-primary override
```

### `<PasswordStrength />`

```tsx
// Score computed from: length≥8, uppercase, digit, special char
const levelColor = score <= 1 ? error : score === 2 ? warning : success
const levelLabel = ['Rất yếu','Yếu','Trung bình','Mạnh','Rất mạnh'][score]
// 4 segment bar + label (11px fw-600)
```

### `<Sidebar />`

- Desktop: fixed div, 260px / 72px collapsed, `transition: width 0.25s ease`.
- Mobile: shadcn `<Sheet>`.
- Collapse state persisted in `localStorage`.
- Nav item **active**: `bg = primaryColor + '12'`, 3px left accent bar (top 20%–bottom 20%), text + icon → primary, fw-700.
- Nav item **inactive**: transparent bg, textSecondary, fw-500. Hover: `#F5F7FA`.
- Collapse toggle: 24×24 circle, `position: absolute; right: -12px; top: 18px`.

### `<Header />`

- 64px height, `border-bottom: 1px solid #E5EAF2`.
- Search: 220px, `bg #F5F7FA`, 13px, `rounded-lg`.
- Notification bell: 38×38, `rounded-[10px]`, bg `#F5F7FA`. Red dot: 18×18, `top: -4px; right: -4px`.
- Avatar dropdown via shadcn `<DropdownMenu>`.

### `<CourseCard />` (Student)

```tsx
// Top color strip: 8px height, course.color
// Hover: translateY(-2px), shadow-card-hover, transition 0.2s
```

### OTP Input (Forgot Password)

```tsx
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
// Slot size: 46×52px, 20px fw-800, rounded-[10px]
```

---

## Interactions & Animations

| Element | Trigger | Spec |
|---------|---------|------|
| Role cards | Hover | `translateY(-1px)`, border → role color, shadow up |
| Course cards | Hover | `translateY(-2px)`, shadow-card-hover |
| Sidebar collapse | Click | `width 260px → 72px`, `transition 0.25s ease` |
| Progress bar | Mount | `0 → value%`, `0.6s ease` |
| Password strength | Type | Segments fill L→R, `transition: background 0.2s` |
| Save button | Click | Optimistic UI + success toast (successLight bg, 3s) |
| SSO buttons | Hover | `border → primary`, subtle primary/10 shadow |
| Table rows | Hover | `background: #F5F7FA` |

---

## Status / Badge Mappings

### Assignment status

| Condition | Color |
|-----------|-------|
| `pending` + daysLeft ≤ 1 | error |
| `pending` + daysLeft ≤ 3 | warning |
| `pending` + daysLeft > 3 | success |
| `submitted` | primary |
| `graded` | success |

### Schedule status

| Status | Style |
|--------|-------|
| `done` | muted bg + muted text |
| `live` | success bg + success text + left border accent (success) |
| `upcoming` | warning bg + warning text |

### Discipline severity

| Severity | Color |
|----------|-------|
| Nhẹ (minor) | warning |
| Vừa (moderate) | error |
| Nặng (serious) | destructive |

---

## shadcn Components Required

```bash
# Core
bunx shadcn@latest add button input badge avatar card table tabs
bunx shadcn@latest add dropdown-menu sheet tooltip scroll-area

# Forms
bunx shadcn@latest add form select textarea checkbox switch toggle-group
bunx shadcn@latest add calendar popover input-otp

# Feedback
bunx shadcn@latest add progress separator collapsible dialog alert-dialog sonner
```

---

## Tailwind v4 Theme Extensions

```css
/* In globals.css @theme block */
--font-sans: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;

/* EduPortal brand tokens */
--color-edu-primary:        #5D87FF;
--color-edu-primary-light:  #ECF2FF;
--color-edu-primary-dark:   #4570EA;
--color-edu-success:        #13DEB9;
--color-edu-warning:        #FFAE1F;
--color-edu-error:          #FA896B;
--color-edu-info:           #539BFF;
--color-edu-purple:         #7B5EA7;
--color-edu-text-primary:   #2A3547;
--color-edu-text-secondary: #5A6A85;
--color-edu-text-muted:     #8898A9;
--color-edu-bg:             #F5F7FA;
--color-edu-border:         #E5EAF2;

--shadow-card:       0 2px 12px rgba(0,0,0,0.04);
--shadow-card-hover: 0 8px 28px rgba(0,0,0,0.10);
```
