# EduPortal — edu-staff-web

Hệ thống quản lý giáo dục đa tenant, đa vai trò (Giáo viên · Hiệu trưởng · Học sinh · Phụ huynh).

Built with **Next.js 16 App Router** · **React 19** · **Tailwind CSS v4** · **shadcn/ui** · **Clean Architecture**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, React Compiler) |
| Runtime | [Bun](https://bun.sh) |
| UI | [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://www.radix-ui.com) + [Tailwind CSS v4](https://tailwindcss.com) |
| Theme | [next-themes](https://github.com/pacocoursey/next-themes) (dark / light / system) |
| i18n | [next-intl](https://next-intl.dev) (`vi`, `en`) |
| Data fetching | [TanStack Query v5](https://tanstack.com/query) + [Axios](https://axios-http.com) |
| Auth | Cookie-based (httpOnly `auth_token`) + Server Actions |
| Component dev | [Storybook 10](https://storybook.js.org) + [Vitest 4](https://vitest.dev) |
| Lint / Format | [Biome](https://biomejs.dev) |

---

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- Node.js ≥ 20

## Getting Started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy env file và điền API URL:

```bash
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server (Turbopack) |
| `bun build` | Production build |
| `bun start` | Run production server |
| `bun lint` | Biome check |
| `bun lint:fix` | Biome auto-fix |
| `bun format` | Biome format (write) |
| `bun vitest` | Run unit tests (watch) |
| `bun vitest:storybook` | Run Storybook component tests |
| `bun storybook` | Start Storybook on port 6006 |
| `bun build-storybook` | Build static Storybook |
| `bun ui:add <name>` | Add shadcn/ui component (auto folder + story) |
| `bun cz` | Interactive conventional commit (czg) |

---

## Architecture: Clean Architecture

Dependency direction — innermost layer không biết gì về outer layer:

```
Domain  ←  Infrastructure  ←  bootstrap/di  ←  app/actions  ←  app/page
                                             ←  presentation (Client Components)
```

### Folder Structure

```
src/
├── app/                          # Next.js App Router — routing + Server Actions ONLY
│   └── [locale]/
│       ├── (auth)/
│       │   └── login/
│       │       ├── page.tsx      # RSC — layout + truyền action prop
│       │       └── actions.ts    # 'use server' — gọi bootstrap/di, set cookie, redirect
│       └── (dashboard)/
│           └── layout.tsx
│
├── features/<feature>/           # Một folder per domain (auth, teacher, student, …)
│   ├── domain/                   # INNERMOST — pure TypeScript, zero framework deps
│   │   ├── entities/             # <name>.entity.ts
│   │   ├── failures/             # <name>.failure.ts — typed error union
│   │   ├── repositories/         # i-<name>.repository.ts — interface (DIP)
│   │   └── use-cases/            # <action>.use-case.ts
│   ├── infrastructure/           # SERVER ONLY — import 'server-only' bắt buộc
│   │   ├── dtos/                 # <name>-response.dto.ts
│   │   ├── mappers/              # <name>.mapper.ts — DTO → Entity
│   │   └── repositories/         # <name>.repository.ts — implements i-<name>
│   └── presentation/             # UI only — không import infrastructure
│       └── <component>/
│           ├── <component>.i-vm.ts   # ViewModel interface
│           └── <component>.tsx       # 'use client'
│
├── bootstrap/                    # Wiring layer
│   ├── di/                       # Composition Root — server-only factory functions
│   │   └── <feature>.di.ts       # makeXxxUseCase()
│   ├── endpoint/                 # API URL constants — tránh magic strings
│   │   └── <feature>.endpoint.ts # AUTH_EP = { login: '/auth/login', … }
│   ├── lib/                      # Framework infrastructure
│   │   ├── http.ts               # createHttpClient(token?) — Axios factory
│   │   ├── http.server.ts        # createServerHttpClient() — server-only, đọc cookie
│   │   └── react-query-provider.tsx
│   └── i18n/                     # next-intl config, routing, messages
│       ├── routing.ts
│       ├── request.ts
│       └── messages/{vi,en}.json
│
├── shared/
│   └── utils.ts                  # cn() = clsx + tailwind-merge
│
└── components/
    ├── ui/                       # shadcn/ui primitives — KHÔNG có business logic
    ├── layout/                   # Shell: Sidebar, Header, DashboardLayout
    └── shared/                   # Cross-feature presentational components
```

### Layer Rules

| Layer | Directive | Được import | KHÔNG được import |
|-------|-----------|-------------|-------------------|
| `domain/` | — | Chỉ types nội bộ | Mọi thứ bên ngoài |
| `infrastructure/` | `'server-only'` | `domain/`, `bootstrap/endpoint/`, `bootstrap/lib/http` | React, next/navigation |
| `bootstrap/di/` | `'server-only'` | `infrastructure/`, `domain/`, `bootstrap/lib/http.server` | Không import từ `app/` |
| `presentation/` | `'use client'` | `domain/entities` (types), `.i-vm.ts`, `shared/utils` | `infrastructure/`, `bootstrap/di/` |
| `app/actions.ts` | `'use server'` | `bootstrap/di/` only | `infrastructure/` trực tiếp |
| `app/page.tsx` | RSC | `presentation/`, `./actions` | `bootstrap/di/`, `infrastructure/` |

### DI Pattern

```ts
// bootstrap/di/auth.di.ts — 'server-only'
export async function makeLoginUseCase() {
  const http = await createServerHttpClient()       // reads httpOnly cookie
  return new LoginUseCase(new AuthRepository(http))
}

// app/[locale]/(auth)/login/actions.ts — 'use server'
export async function loginAction(email: string, password: string) {
  const useCase = await makeLoginUseCase()
  const result = await useCase.execute(email, password)
  // set cookie, redirect — không chạm client bundle
}
```

### Client Bundle Guard

`infrastructure/` và `bootstrap/di/` đều có `import 'server-only'` — Next.js build **fail ngay** nếu bị import trong Client Component.

---

## Git Workflow

### Commit Convention

Format: `<type>(<scope>): <subject>`

**Types**: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`

```bash
bun cz          # interactive UI
# hoặc:
git commit -m "feat(auth): add login page"
```

> Chạy `git commit -m ""` (message rỗng) sẽ tự bật czg UI — yêu cầu TTY, skip khi CI.

### Branch Naming

`<type>/<short-desc>` — e.g. `feat/login-page`, `fix/auth-cookie`. `main`, `dev`, `develop` được miễn.

### Git Hooks (Lefthook)

Auto-installed qua `prepare` script khi `bun install`.

| Hook | Runs |
|------|------|
| `pre-commit` | Biome (auto-fix staged) · `tsc --noEmit` · `vitest related` |
| `prepare-commit-msg` | Auto-launch czg khi commit message rỗng |
| `commit-msg` | commitlint |
| `pre-push` | branch-name check · `vitest run` · `next build` |

---

## Internationalization

Routes được locale-scope dưới `src/app/[locale]/`. Supported: `vi` (default), `en`.

- Translations: `src/bootstrap/i18n/messages/{vi,en}.json`
- Routing config: `src/bootstrap/i18n/routing.ts`
- Middleware: `src/middleware.ts`
- Server Component: `getTranslations()` · Client Component: `useTranslations()`

---

## Theming

Dark/light theme dùng CSS variables trong `src/app/globals.css` (`:root` light, `.dark` dark) với `next-themes` toggle class trên `<html>`.

- **Default**: `system` (theo OS), fallback light
- **Storybook**: toolbar Light/Dark switch via `@storybook/addon-themes`
- **Multi-tenant**: override `--color-primary` per-tenant qua CSS variable

---

## Storybook

```bash
bun storybook          # http://localhost:6006
bun vitest:storybook   # run component tests (browser + Playwright)
```

---

## Deploy

Optimized for [Vercel](https://vercel.com/new). Any Node 20+ host:

```bash
bun build && bun start
```
