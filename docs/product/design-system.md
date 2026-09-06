# Design System — EduPortal (product contract)

Bản đọc-hiểu của design system. Quy tắc enforceable ở
`.claude/rules/design-system.md`; runtime token ở `src/app/tokens.css`. Nguồn:
legacy handoff coi là spec hình ảnh/UX (decision `0011`).

## Định hướng

Sạch, chuyên nghiệp, **accessibility-first** (decision `0013`), thân thiện cho
môi trường giáo dục đa lứa tuổi. Một hệ thống thống nhất; phân biệt vai trò chỉ
qua color accent. Font **Plus Jakarta Sans**.

## Token (tóm tắt — chi tiết ở tokens.css)

- **Brand**: primary `#5D87FF` (light `#ECF2FF`, dark `#4570EA`).
  - `--edu-primary` (#5D87FF) = full brand blue (per-tenant override target, decision 0007).
  - `--primary` semantic var → **`#4570EA`** (accessible shade, WCAG AA 4.41:1 on white; passes for UI components / large text, ADR 0023 / US-E07.2).
  - `--edu-primary-accessible` → **`#4468e0`** (4.88:1 on white; for small-text active states, e.g. pagination, ADR 0031 / US-E07.6).
- **Status**: success `#13DEB9`, warning `#FFAE1F`, error `#FA896B`, info
  `#539BFF`, purple `#7B5EA7`, teal `#00B8A9`.
  - `--edu-warning-text` → `#9A6A0F` — amber text on warningLight surface (4.37:1, large/bold ≥14px only). Decision 0046.
- **Surface**: bg `#F5F7FA`, card `#FFF`, border `#E5EAF2`.
  - **Media chrome** (video/audio player, always-dark regardless of app theme):
    `--edu-media-surface` `#0F1117`, `--edu-media-surface-foreground` `#FFFFFF`
    (19.6:1, AAA). Dùng cho faux/real video player content pane (vd Student
    Lesson Player, US-E11.6). ADR 0050.
- **Text**: primary `#2A3547`, secondary `#5A6A85`, muted `#8898A9`.
  - `--muted-foreground` (shadcn alias) → **`--edu-text-secondary`** (5.48:1) — KHÔNG
    còn trỏ `--edu-text-muted` (2.95:1, fail AA cho icon/text nhỏ). `text-edu-text-muted`
    chỉ dùng có chủ đích cho nội dung decorative/không thiết yếu. ADR 0049.
  - Text/icon lỗi trên nền sáng → `--edu-error-text` (#C0392B); `--destructive`
    (#FA896B) chỉ dành cho background (`bg-destructive` + chữ trắng, alpha wash). ADR 0049.
- **Dark mode** (US-E24.12 — bộ token thật từ handoff v3 `design_src/edu/tokens.js`
  `T_DARK`, thay bộ tạm của US-E17.11; chỉ đổi GIÁ TRỊ biến đã có, không biến mới):
  surface `--edu-bg #151B23`, `--edu-card #1E2630`, `--edu-border #33404E`,
  chip/hover surface (`--secondary`/`--muted`/`--accent`/`--sidebar-accent`) `#2A333E`
  (T_DARK `chipBg`), `--input #161D26` (`inputBg`); text `--edu-text-primary #EAEFF5`,
  `--edu-text-secondary #B4C0CE`, `--edu-text-muted #8494A7`; tint trạng thái
  `--edu-primary-light #28344E`, `--edu-success-light #123330`, `--edu-info-light
  #1D2E47`, `--edu-purple-light #2E2743`, `--edu-teal-light #12312F`; text tone
  `--edu-success-text #3FD0B3` (7.9:1 trên card), `--edu-teal-text #4FC3B5` (7.1:1).
  **Giữ nguyên** cặp error/warning dark của US-E21.2 (`--edu-error-light #5C0007` /
  `--edu-error-text #FFDAD6`, `--edu-warning-light #4D3300` / `--edu-warning-text
  #FFD699`, ≥8.5:1) — `T_DARK` override tint nhưng KHÔNG có text tone tương ứng.
  `--edu-warning-foreground` (#2A3547) KHÔNG có giá trị dark (chữ trên nền vàng đặc
  luôn là navy) → chip warning dùng `text-edu-text-primary` (theo-theme), giống
  info/purple/teal. `--edu-error-dark-light` vẫn chưa có giá trị dark (chip
  `error-dark` còn sáng ở dark mode — follow-up). ADR 0049 + US-E24.12 Evidence.
- **Role**: teacher=primary, principal=success, student=warning, parent=purple.
- **Per-tenant**: override `--edu-primary` (decision `0007`).

## Typography scale

page-title 22/800 · section-title 18/800 · card-title 15/700 · body 13–14/400–500
· label 12/700 UPPER · caption 11/400 · stat-value 26/800.

## Spacing / radius / shadow

Sidebar 260/72px, header 64px, card pad 20–24px, gap 16px. Radius btn 8 / card 12
/ role-icon 16 / badge full / otp 10. Shadow card / card-hover / toggle.

## Component & status mappings

Xem `.claude/rules/design-system.md` (StatCard, Badge, ProgressBar, Sidebar,
score colors, assignment/schedule/discipline badge mappings).

- **Shared screen-state primitives** (`design_src/edu/states.jsx`, group B
  handoff v2.2, 2026-07-12): canonical loading/empty/error/coming-soon markup
  for every screen — supersedes bespoke per-screen versions (retired
  `FeedSkeleton`/`FeedEmpty`/`FeedError` in `feed.jsx` and
  `ModSkeleton`/`ModEmpty`/`ModError` in `moderation.jsx` are now thin
  screen-specific wrappers around these shared primitives, not standalone
  implementations; `invitations.jsx` and `reports.jsx` use them directly).
  Tokens-only, mirrors to production at `src/components/ui/screen-states/`.
  - `EduSkeleton({ variant, count, lang })` — shimmer skeleton, `variant:
    'rows'` (list/table) | `'cards'` (stat-card grid); shimmer animation must
    stay motion-safe (`prefers-reduced-motion`) when ported to production.
  - `EduEmpty({ icon, title, desc, action, color })` — valid-empty-data state,
    icon chip (`bg = color/14`), optional single CTA action.
  - `EduError({ title, desc, onRetry })` — load-failure state, always renders
    a retry action when `onRetry` provided; `role="alert"`.
  - `EduComingSoon({ title })` — nav module not yet designed (dashed border,
    distinct from `EduEmpty`).
- **Token mirror confirmed**: `design_src/edu/tokens.js` `warningText`
  (`#9A6A0F`, decision `0046`) and `errorText` (`#C0392B`, decision `0027`)
  mirror `--edu-warning-text`/`--edu-error-text` in `tokens.css` — no new
  tokens introduced by the group B batch.

## A11y & motion

WCAG 2.1 AA; warning vàng → text tối; animation gate `prefers-reduced-motion`;
chỉ micro-interaction trong handoff. Chi tiết: `.claude/rules/accessibility.md`.

## Quy trình thay đổi

Token mới → `tokens.css` → map `@theme` → sync file này. Story UI qua
`docs/DESIGN_REVIEW.md`. Đổi chính design system → ghi decision.
