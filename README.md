# edu-staff-web

Next.js 16 + React 19 + Tailwind v4 + shadcn/ui application for edu-staff management.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, React Compiler)
- **Runtime**: [Bun](https://bun.sh)
- **UI**: [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://www.radix-ui.com) + [Tailwind CSS v4](https://tailwindcss.com)
- **Theme**: [next-themes](https://github.com/pacocoursey/next-themes) (dark/light/system)
- **i18n**: [next-intl](https://next-intl.dev) (vi, en)
- **Data**: [TanStack Query](https://tanstack.com/query) + [Axios](https://axios-http.com)
- **Forms**: [react-day-picker](https://daypicker.dev), [date-fns](https://date-fns.org)
- **Component Dev**: [Storybook 10](https://storybook.js.org) + [Vitest](https://vitest.dev)
- **Lint/Format**: [Biome](https://biomejs.dev)

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- Node.js ≥ 20

## Getting Started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command               | Description                       |
| --------------------- | --------------------------------- |
| `bun dev`             | Start dev server                  |
| `bun build`           | Production build                  |
| `bun start`           | Run production server             |
| `bun lint`            | Biome check                       |
| `bun format`          | Biome format (write)              |
| `bun storybook`       | Start Storybook on port 6006      |
| `bun build-storybook` | Build static Storybook            |
| `bun ui:add <name>`   | Add shadcn/ui component           |
| `bun ui:diff`         | Diff local components vs registry |
| `bun cz`              | Commit interactively (czg UI)     |

## Git Workflow

### Commit Convention (Conventional Commits)

Format: `<type>(<scope>): <subject>`

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

Examples:

```
feat(theme): add dark/light toggle
fix(auth): handle expired token
chore(deps): bump next to 16.0.10
```

Use `bun cz` for an interactive prompt (powered by [czg](https://cz-git.qbb.sh/)).

> **Tip**: chạy `git commit -m ""` (message rỗng) cũng sẽ tự động bật UI czg interactive — tiện khi bạn quên dùng `bun cz`. Yêu cầu TTY (terminal), sẽ skip khi chạy từ GUI client / CI.

### Branch Naming

`<type>/<short-desc>` — e.g. `feat/dark-theme`, `fix/login-bug`. Same type list as commits. `main`, `dev`, `develop` exempt.

### Git Hooks (Lefthook)

Auto-installed via `prepare` script on `bun install`.

| Hook                 | Runs                                                          |
| -------------------- | ------------------------------------------------------------- |
| `pre-commit`         | Biome (auto-fix staged) · `tsc --noEmit` · `vitest related`   |
| `prepare-commit-msg` | Auto-launch czg UI khi `git commit -m ""` (empty message)     |
| `commit-msg`         | commitlint (Conventional Commits rules)                       |
| `pre-push`           | branch-name check · `vitest run` · `next build`               |

Bypass with `git commit --no-verify` / `git push --no-verify` when truly needed (WIP, hotfix).

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── [locale]/           # Locale-scoped routes (vi, en)
│   ├── globals.css         # Tailwind + theme tokens (light/dark)
│   └── layout.tsx          # Root layout (ThemeProvider mounted here)
├── components/
│   ├── ui/                 # shadcn/ui primitives (button, input, select, calendar)
│   ├── layout/             # Layout-level components (header, sidebar, ...)
│   ├── shared/             # Cross-feature shared components
│   ├── theme-provider.tsx  # next-themes wrapper
│   └── theme-toggle.tsx    # Light/Dark toggle button
├── features/               # Feature-scoped modules (auth, user, ...)
├── i18n/
│   ├── messages/           # Translation JSON (vi.json, en.json)
│   └── routing.ts          # next-intl routing config
├── lib/                    # Utilities (cn, fetcher, ...)
├── stories/                # Storybook examples
└── middleware.ts           # next-intl locale middleware
```

## Theming

Dark/light theme uses CSS variables in `src/app/globals.css` (`:root` for light, `.dark` for dark) with `next-themes` toggling the `dark` class on `<html>`.

- **Provider**: `src/components/theme-provider.tsx` (mounted in root layout)
- **Toggle**: `src/components/theme-toggle.tsx` — drop into header
- **Default**: `system` (follows OS), fallback light
- **Storybook**: toolbar has Light/Dark switch via `@storybook/addon-themes`

To replace the theme palette:

```bash
bun ui:add <theme-registry-url>
```

Backup `globals.css` first — registry themes overwrite CSS variables.

## Internationalization

Routes are locale-scoped under `src/app/[locale]/`. Supported locales: `vi`, `en`.

- Add/edit translations in `src/i18n/messages/{locale}.json`
- Routing config: `src/i18n/routing.ts`
- Middleware: `src/middleware.ts`

## Storybook

```bash
bun storybook
```

Opens at [http://localhost:6006](http://localhost:6006). Toolbar includes a theme toggle (Light/Dark) and a11y addon.

## Deploy

Optimized for [Vercel](https://vercel.com/new). Any Node 20+ host works with `bun build && bun start`.
