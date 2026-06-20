# EduPortal — claude.ai Design Project Sync Guide

> **Purpose:** Copy-paste prompts to sync the claude.ai design project (`edustaff_5`)
> with the production stack and the impeccable UI fixes applied to the reference mockups.
>
> **Target project:** `/Users/vietthangpham/Downloads/edustaff_5`
> (and the `design_handoff_eduportal` / `design_handoff_eduportal_complete` subdirs)
>
> **Canonical source of truth for this repo:** `design_src/edu/*.jsx` + `docs/product/design-spec.jsonc`

---

## 2.1 — Corrected Tech Stack Description

The `design_handoff_eduportal/CLAUDE_CODE_GUIDE.md` currently states:

```
Framework:     Next.js 14+ (App Router)
State:         React useState / useContext (or Zustand for global auth)
Auth:          NextAuth.js (supports Google, Facebook OAuth + credentials)
Styling:       Tailwind CSS
```

This is **wrong**. The real project stack is:

```
Framework:     Next.js 16 (App Router, Turbopack dev)
UI Library:    shadcn/ui (New York style) — add with: bun ui:add <name>
Styling:       Tailwind CSS v4 (no tailwind.config.ts — config is @theme in globals.css)
Icons:         Custom Icon component (design_src/edu/icons.jsx) — NOT lucide-react directly
Fonts:         Plus Jakarta Sans via next/font/google (NOT Google Fonts CDN link)
State:         TanStack Query (server data); React local state (UI state); NO global store
Auth:          Custom JWT via edu-api IAM service (accessToken + refreshToken in httpOnly
               cookies); NO NextAuth.js
Package mgr:   bun (NOT npm/yarn/pnpm)
Linter/fmt:    Biome (NOT ESLint + Prettier)
Testing:       Vitest 4 (unit/integration) + Storybook 10 (story/interaction) +
               Playwright (E2E via @vitest/browser-playwright)
Architecture:  Clean Architecture — domain / infrastructure / bootstrap/di / presentation
               layers per feature; see src/features/<feature>/{domain,infrastructure,presentation}/
i18n:          next-intl — all UI strings in src/bootstrap/i18n/messages/{vi,en}.json;
               useTranslations() client, getTranslations() server; vi = source key
Design tokens: src/app/tokens.css (runtime source of truth);
               design_src/edu/tokens.js (reference mockup mirror — keep in sync)
```

### Prompt to feed into claude.ai design project

```
UPDATE TECH STACK — this project now uses the following real production stack.
Please update any CLAUDE_CODE_GUIDE.md, README.md, or SCREENS.md that mention
the old stack:

- Framework: Next.js 16 (App Router, Turbopack). NOT Next.js 14.
- Styling: Tailwind CSS v4. Config is CSS-first via @theme in src/app/globals.css.
  No tailwind.config.ts file. NEVER use raw colors — only semantic tokens from
  src/app/tokens.css (or design_src/edu/tokens.js in these mockups).
- UI components: shadcn/ui added with `bun ui:add <name>`, NOT copy-pasted from
  shadcn.com. Each component lives in src/components/ui/<name>/ with index.ts
  re-export and .stories.tsx.
- State management: TanStack Query for server data. React local state (useState)
  for UI state. NO Zustand. NO global store.
- Auth: Custom JWT via edu-api IAM service. Tokens stored in httpOnly cookies
  (accessToken + refreshToken + sessionId). NOT NextAuth.js.
- Package manager: bun. All scripts run with `bun`. NOT npm/yarn/pnpm.
- Linting/formatting: Biome (`bun lint`, `bun lint:fix`). NOT ESLint + Prettier.
- Testing: Vitest 4 (unit/integration) + Storybook 10 (stories + interaction tests)
  + Playwright for E2E. TDD is required: write failing tests first.
- i18n: next-intl. ALL UI strings must be in
  src/bootstrap/i18n/messages/{vi,en}.json. No hardcoded Vietnamese text in .tsx.
  useTranslations() in client components, getTranslations() in RSC.
- Architecture: Clean Architecture. Each feature lives in
  src/features/<feature>/{domain,infrastructure,presentation}/. Server-only
  infrastructure via `import 'server-only'`. No infrastructure imports in
  presentation components. Dependency injection at bootstrap/di/<feature>.di.ts.

Please confirm you understand this stack before generating any code.
```

---

## 2.2 — UI Change Prompts (impeccable fixes A–E)

Apply these prompts to the `edustaff_5` claude.ai design project to sync the same
anti-pattern fixes that were applied to the production reference mockups in this repo.

Each prompt is self-contained. Apply them in order (a → b → c → d → e) as each
builds on the same file set.

---

### Prompt A — Side-stripe ban (border-left on cards/rows/callouts)

```
ANTI-PATTERN FIX — Remove all `border-left` / `borderLeft` side stripes from
cards, list rows, callout blocks, and timetable/schedule cells. This is an
impeccable-flagged anti-pattern: colored left borders break visual rhythm and
imply hierarchy that does not exist.

Rules for replacement:
1. SELECTED / ACTIVE LIST ROW (e.g. ConversationItem, lesson chapter list,
   session list, teaching-plan review list):
   - Remove: borderLeft: `3px solid pColor` (or transparent)
   - Add: background: pColor + '16' (bumped from '0E'/'0B' to ~9% tint)
   - Keep: border: 'none'

2. CALLOUT / REASON BLOCK (e.g. RequestCard reason, UnsealCard warning note,
   NotificationPreview callout, ReplyStrip, ChatBubble quote strip,
   SonnerToast, DeletePreview):
   - Remove: borderLeft: `3px solid color` or `4px solid color`
   - Add: background: color + '0F' (or color + '14' for status-tinted blocks)
   - Add: border: `1px solid color + '33'` (full 1px border, low opacity)

3. SCHEDULE/TIMETABLE CELL (timetable.jsx TTCell, timetable-view.jsx TVCell,
   legend chips):
   - Remove: borderLeft: `3px solid accent`
   - Add: border: `1px solid accent + '30'` (full 1px)

4. LIVE SCHEDULE ROW (teacher.jsx TeacherDashboardHome period list):
   - Remove: borderLeft: live ? `3px solid success` : `3px solid transparent`
   - Add: background: s.status === 'live' ? T.successLight : 'transparent'

DO NOT change the sidebar active-item rail (sidebar.tsx / ui.jsx Sidebar
nav item active state — that 3px left bar is the navigation indicator,
intentionally kept per design system).

After applying, verify: search for `borderLeft` in ALL jsx files. The only
remaining instances should be inside the Sidebar nav item active styles.
```

---

### Prompt B — Error-ramp contrast (notification badges + danger button)

```
ANTI-PATTERN FIX — White text on soft coral T.error (#FA896B) fails WCAG AA
(contrast ratio 2.36:1). Fix all instances that put #fff or white on T.error.

Tokens already available in tokens.js (add if missing):
  errorDark:        '#B91C1C',   // 8.2:1 on white — AA + AAA
  errorDarkLight:   '#FEE2E2',
  errorForeground:  '#FFFFFF',   // white IS safe on errorDark
  warningForeground:'#2A3547',   // NEVER white on warning yellow
  successForeground:'#FFFFFF',

Changes to make:

1. Header bell notification badge (ui.jsx Header component):
   background: T.errorDark  (was T.error)
   color: T.errorForeground  (was '#fff')

2. Sidebar item.badge (ui.jsx Sidebar — the red count badge on nav items):
   background: T.errorDark  (was T.error)
   color: T.errorForeground  (was '#fff')

3. Button variant="danger" (ui.jsx Button):
   background on hover: T.errorDark + 'E6'  (was '#e0745a')
   background default:  T.errorDark          (was T.error)
   color: T.errorForeground                  (was '#fff')

DO NOT change: Badge components or StatusBadge with bg=T.error + tinted text
(those already use T.error correctly as a soft background, not a solid fill).
DO NOT change: any button that already uses a specific accessible color.

After applying, verify by searching for `T.error` used as a solid fill color
(background) paired with white text — there should be none remaining.
```

---

### Prompt C — a11y and interaction gaps

```
ANTI-PATTERN FIX — Interactive elements missing keyboard support, ARIA labels,
and accessible focus rings. Apply these fixes:

1. CARD COMPONENT (ui.jsx Card) — Currently uses inline `:hover` CSS pseudo
   (React ignores pseudo-class in style prop — does nothing):
   - Add React.useState(hovered, focused) tracking
   - Add role="button", tabIndex={0} when onClick is present
   - Add onKeyDown: if e.key === 'Enter' or ' ': e.preventDefault(); onClick(e)
   - Add onMouseEnter/Leave and onFocus/Blur handlers
   - Compute `lifted = interactive && (hovered || focused)`
   - boxShadow: lifted ? '0 4px 20px rgba(0,0,0,0.08)' : '0 2px 12px rgba(0,0,0,0.04)'
   - When focused: add '0 0 0 2px T.primary' to boxShadow (focus ring)
   - outline: 'none' (focus ring is via boxShadow, not outline)
   - transform: lifted ? 'translateY(-2px)' : 'none'

2. PROGRESSBAR (ui.jsx ProgressBar):
   - Add role="progressbar" on the outer div
   - Add aria-valuenow={Math.round(pct)}, aria-valuemin={0}, aria-valuemax={100}

3. HEADER (ui.jsx Header):
   - Notification bell button: add aria-label with live count, e.g.:
     notifCount > 0 ? `Thông báo (${notifCount} mới)` : 'Thông báo'
   - Notification count badge (the red dot): add aria-hidden="true"
     (screen reader reads it from the button's aria-label instead)
   - Avatar menu button: add aria-haspopup="menu", aria-expanded={showDropdown},
     aria-label="Tài khoản và đổi vai trò"
   - Avatar dropdown: add outside-click dismiss (useRef + document mousedown listener)
     and Escape key dismiss (keydown listener). Clean up listeners on effect cleanup.
   - Search input: add aria-label="Tìm kiếm"

4. SIDEBAR (ui.jsx Sidebar):
   - Collapse toggle button: add aria-label (Vietnamese: 'Thu gọn/Mở rộng thanh điều hướng')
     and aria-expanded={!collapsed}
   - Nav item buttons: add aria-current="page" on the active item
   - Nav item hover: add onMouseEnter/Leave to set background (currently no hover state)

After applying, verify:
- All interactive Cards can receive Tab focus and activate with Enter/Space
- Bell button, avatar button, and collapse button all have aria-label
- Search input has aria-label
- Active nav item has aria-current="page"
```

---

### Prompt D — Layout-transition performance (GPU compositing)

```
ANTI-PATTERN FIX — Progress bar fills using `width: X%` with `transition: width`
cause browser layout recalculation on every animation frame. Replace with
transform: scaleX() for GPU-composited animation.

Apply to ALL progress-bar-like fill elements:

Pattern to find:
  width: `${value}%`, transition: 'width 0.Xs ...'

Replace with:
  width: '100%',
  transformOrigin: 'left center',   // or just 'left'
  transform: `scaleX(${value / 100})`,
  transition: 'transform 0.Xs ...'   // same duration as before

Files to update:
- ui.jsx ProgressBar fill div
- announcements.jsx ProgressTrack fill div
- assessment.jsx SchemeEditor progress fill div (tracks totalWeight / 100)
- gradebook.jsx SummaryPanel distribution bar fill div

For SIDEBAR collapse (ui.jsx Sidebar outer wrapper):
- Replace `transition: 'width 0.25s ease'` on the outer container
  with a CSS grid approach:
  display: 'grid', gridTemplateColumns: `${W}px`, transition: 'grid-template-columns 0.25s ease'
  Add an inner wrapper div for the actual sidebar content (minWidth: 0)
  This animates grid-template-columns instead of width — no layout thrash.

After applying, verify: search for `transition: 'width` in all jsx files.
The only remaining `width` transitions should be on elements that are not
fill/progress bars (e.g., general width changes that cannot use scaleX).
```

---

### Prompt E — Bounce easing (typing indicator)

```
ANTI-PATTERN FIX — messaging.jsx typing indicator uses @keyframes bounce with
per-dot DURATION variation (1s / 1.15s / 1.3s). This creates a duration desync
that looks like a stutter rather than a smooth stagger.

Replace the per-dot duration approach with a staggered animation-delay approach:

OLD (remove):
  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-4px); }
  }
  // dot styles: animation: `bounce ${1 + j * 0.15}s infinite`

NEW (apply):
  @keyframes msg-typing {
    0%, 70%, 100% { opacity: 0.35; transform: translateY(0); }
    35%           { opacity: 1;    transform: translateY(-3px); }
  }
  // dot styles: animation: `msg-typing 1.2s ${j * 0.18}s ease-in-out infinite`
  // j = 0, 1, 2 → delays: 0s, 0.18s, 0.36s
  // Remove the per-dot duration variation entirely

The new keyframe uses:
- Single duration (1.2s) for all 3 dots — uniform rhythm
- Staggered delay (0.18s apart) for the wave effect
- Opacity pulse (0.35 → 1) + small translateY (0 → -3px) — subtle and non-distracting
- ease-in-out easing for smooth entry and exit

After applying, verify: the typing indicator in messaging.jsx uses `msg-typing`
(or equivalent name) with identical duration for all dots and staggered delays.
```

---

## Verification Checklist

After applying all 5 prompts to the claude.ai design project, verify sync:

### (a) Side-stripe ban
- [ ] Search `borderLeft` in all `edu/*.jsx` — only Sidebar active-item rail remains
- [ ] Selected list rows use background tint (`pColor + '16'`) with no border-left
- [ ] Callout/reason blocks use full `border: 1px solid color + '33'` + tinted bg
- [ ] Timetable/schedule cells use `border: 1px solid accent + '30'`
- [ ] Live schedule row uses background tint, not side stripe

### (b) Error-ramp contrast
- [ ] `tokens.js` has `errorDark: '#B91C1C'` and `errorForeground: '#FFFFFF'`
- [ ] Header bell badge: `background: T.errorDark, color: T.errorForeground`
- [ ] Sidebar item.badge: same
- [ ] Button variant="danger": `background: T.errorDark`
- [ ] No instance of `background: T.error, color: '#fff'` remains (search both)

### (c) a11y
- [ ] Interactive Card has `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space)
- [ ] Card focus ring visible (boxShadow includes `0 0 0 2px T.primary` when focused)
- [ ] ProgressBar has `role="progressbar"` + `aria-valuenow/min/max`
- [ ] Bell button has `aria-label` with count
- [ ] Collapse button has `aria-label` + `aria-expanded`
- [ ] Avatar button has `aria-haspopup="menu"` + `aria-expanded`
- [ ] Dropdown closes on outside-click and Escape key
- [ ] Active nav item has `aria-current="page"`
- [ ] Search input has `aria-label`

### (d) GPU transition
- [ ] No `transition: 'width` on fill/progress-bar elements
- [ ] All fill divs use `transform: scaleX()` + `transformOrigin: 'left'`
- [ ] Sidebar uses `grid-template-columns` transition, not `width` transition

### (e) Bounce easing
- [ ] `@keyframes bounce` removed from messaging.jsx
- [ ] `@keyframes msg-typing` (or equivalent) present with opacity + translateY
- [ ] All 3 dots use same duration (1.2s) with staggered delays (0s / 0.18s / 0.36s)
- [ ] `ease-in-out` easing applied

### Stack sync
- [ ] CLAUDE_CODE_GUIDE.md updated: Next.js 16, Tailwind v4, bun, Biome, TanStack Query, no NextAuth
- [ ] Any mention of `npm install` or `npx create-next-app@14` is corrected to bun + Next.js 16
- [ ] README.md design token section references `src/app/tokens.css` as runtime source of truth
