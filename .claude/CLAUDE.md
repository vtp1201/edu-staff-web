# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Bootstrap (Harness)

This repo runs on **Harness**. `AGENTS.md` được inject mỗi session qua SessionStart
hook (decision `0015`); `.claude/rules/*` tự load. Trước khi làm:

- Đọc `AGENTS.md` (chỉ mục) → `docs/HARNESS.md`, `docs/FEATURE_INTAKE.md`,
  `docs/ARCHITECTURE.md`, `docs/CONTEXT_RULES.md`.
- **Intake mọi prompt** qua `docs/FEATURE_INTAKE.md`; ghi durable bằng
  `scripts/bin/harness-cli` (story/decision). Story UI qua `docs/DESIGN_REVIEW.md`.

## Agent Teams

Two Harness-bound teams live in `.claude/agents/`. Always enter through a **lead** (via its
slash command); never invoke individual specialists directly.

### Frontend Developer Team — `/fe` → `fe-lead` (`.claude/agents/fe/`)
Implements all frontend work. Pipeline:
```
Feature Intake → fe-planner → [fe-component-architect + fe-state-engineer] (parallel, when needed)
   → fe-nextjs-engineer (TDD) → [fe-tech-lead-reviewer + fe-accessibility-auditor] (parallel)
   → design-review gate (docs/DESIGN_REVIEW.md + /impeccable) → fe-qa-playwright → Harness proof
```
- `fe-lead` *(sonnet)* — entry point; owns intake, story packet, pipeline, gates, **parallel branch workflow (decision `0025`)**.
- `fe-planner` *(sonnet)* — phased plan in the packet (no code).
- `fe-component-architect` *(sonnet)* — component tree + ViewModel/prop contracts.
- `fe-state-engineer` *(sonnet)* — TanStack Query keys/invalidation, RSC↔client boundary (no global store).
- `fe-nextjs-engineer` *(opus)* — the SOLE implementer; Clean-Arch layers, shadcn/Tailwind v4, i18n, strict TDD.
- `fe-tech-lead-reviewer` *(opus)* — mandatory quality gate (layers, types, tokens, i18n, security, tests).
- `fe-accessibility-auditor` *(sonnet)* — WCAG 2.1 AA audit (parallel with reviewer).
- `fe-qa-playwright` *(sonnet)* — Storybook interaction + Playwright E2E, Go/No-Go.
- `fe-debugger` *(sonnet)* — RCA for render/hydration/RSC/cache/build issues.

### Business Analyst Team (UI-focused) — `/ba` → `ba-lead` (`.claude/agents/ba/`)
Produces engineering-ready specs the FE team builds from; stops before code. Pipeline:
```
Feature Intake → ba-requirements-analyst → [ba-integration-analyst] → ba-use-case-modeler → ba-spec-writer
```
- `ba-lead` *(sonnet)* — entry point; intake + story packet + handoff to `fe-lead`.
- `ba-requirements-analyst` *(sonnet)* — TR-XXX requirements, actors/roles, scope.
- `ba-integration-analyst` *(sonnet)* — maps edu-api endpoints the screen consumes (service map; mock-first when absent).
- `ba-use-case-modeler` *(sonnet)* — use cases + Given/When/Then AC (loading/empty/error/success + role variants).
- `ba-spec-writer` *(sonnet)* — consolidated engineering-ready spec + traceability matrix.

### Model rationale (resource ↔ capability)
`opus` for the two highest-leverage, correctness-critical roles — `fe-nextjs-engineer` (the sole
implementer) and `fe-tech-lead-reviewer` (the last gate before merge). `sonnet` for orchestration,
planning, design, analysis, audit, QA, and debugging (strong reasoning at lower cost; these run
many turns). No `haiku` — even the checklist roles (a11y, QA) need nuance over JSX/tokens. Mirrors
edu-api's convention (heavy implementer = opus; leads/specialists = sonnet).

## Sibling repo

Backend is **edu-api** (Go microservices) with its own `/ba` and `/be` teams. This web team
**consumes** edu-api's REST contracts (`.claude/rules/api-integration.md` + the service's
`openapi.yaml`/`INTEGRATION.md`) — it never writes Go.

## Commands

```bash
# Development
bun dev              # Start Next.js dev server (Turbopack)
bun build            # Production build
bun start            # Run production server

# Code Quality
bun lint             # Biome check
bun lint:fix         # Biome auto-fix
bun format           # Biome format

# Testing
bun vitest           # Run tests interactively
bun vitest run       # Run all tests once
bun vitest related <file>  # Run tests related to a specific file

# Storybook
bun storybook        # Start Storybook on port 6006
bun build-storybook  # Static Storybook build

# UI Components
bun ui:add <name>    # Add shadcn/ui component (auto-creates folder + story)

# Commits
bun cz               # Interactive conventional commit via czg
```

## Architecture: Clean Architecture

Dependency direction — innermost layer không biết gì về outer layer:

```
Domain  ←  Infrastructure  ←  bootstrap/di  ←  app/actions.ts  ←  app/page.tsx
                                             ←  presentation (Client Components)
```

```
src/
├── app/                          # Next.js App Router — routing + Server Actions ONLY
│   └── [locale]/
│       ├── (auth)/login/
│       │   ├── page.tsx          # RSC — kết nối presentation + truyền action prop
│       │   └── actions.ts        # 'use server' — gọi bootstrap/di, set cookie, redirect
│       └── (dashboard)/layout.tsx
│
├── features/<feature>/           # Một folder per domain (auth, teacher, student, …)
│   ├── domain/                   # INNERMOST — pure TypeScript, zero framework/lib deps
│   │   ├── entities/             #   <name>.entity.ts — business object types
│   │   ├── failures/             #   <name>.failure.ts — typed error union
│   │   ├── repositories/         #   i-<name>.repository.ts — interface (DIP)
│   │   └── use-cases/            #   <action>.use-case.ts — orchestration, no side effects
│   ├── infrastructure/           # SERVER ONLY — import 'server-only' bắt buộc trong mọi repo
│   │   ├── dtos/                 #   <name>-response.dto.ts — API response shape
│   │   ├── mappers/              #   <name>.mapper.ts — DTO → Entity
│   │   └── repositories/         #   <name>.repository.ts — implements i-<name>.repository
│   └── presentation/             # UI only — không import infrastructure, không gọi http
│       └── <component>/
│           ├── <component>.i-vm.ts   # ViewModel interface — contract server↔client
│           └── <component>.tsx       # 'use client' — nhận VM props + action prop
│
├── bootstrap/                    # Wiring layer — chỉ import ở đây, không export ra ngoài
│   ├── di/                       # Composition Root
│   │   ├── <feature>.di.ts       # import 'server-only'; makeXxxUseCase() factory
│   │   └── index.ts              # re-export tất cả factories
│   ├── endpoint/                 # API URL constants — tránh magic strings trong repositories
│   │   ├── <feature>.endpoint.ts # export const AUTH_EP = { login: '/auth/login', … }
│   │   └── index.ts
│   ├── lib/                      # Framework infrastructure (HTTP, QueryClient)
│   │   ├── http.ts               # createHttpClient(token?) — Axios factory
│   │   ├── http.server.ts        # createServerHttpClient() — server-only, đọc httpOnly cookie
│   │   └── react-query-provider.tsx
│   └── i18n/                     # next-intl config, routing, messages
│       ├── routing.ts
│       ├── request.ts
│       └── messages/{vi,en}.json
│
├── shared/
│   └── utils.ts                  # cn() = clsx + tailwind-merge — dùng được ở mọi layer
│
└── components/
    ├── ui/                       # shadcn/ui primitives — KHÔNG có business logic
    ├── layout/                   # Shell: Sidebar, Header, DashboardLayout
    └── shared/                   # Cross-feature presentational components
```

## Design System

Trước khi viết bất kỳ UI nào (component, page, layout), LUÔN tham khảo (vị trí
mới sau decision `0010` — `docs/design/` cũ đã bị harness xóa):

- `.claude/rules/design-system.md` — design rules, token, component patterns (enforceable).
- `src/app/tokens.css` — **runtime source of truth** cho color, spacing,
  typography, radius. Class Tailwind/CSS variable BẮT BUỘC dùng token tồn tại
  trong file này (map ở `@theme` trong `globals.css`).
- `.claude/rules/accessibility.md` — a11y baseline + motion-safe (decision `0013`).
- `docs/product/design-system.md` — product contract; `docs/product/screens.md` — screen inventory.
- `docs/DESIGN_REVIEW.md` + `.claude/rules/impeccable.md` — design-review gate (decision `0012`).

### Rules cứng
- KHÔNG dùng raw color (`#fff`, `slate-100`, `text-gray-500`) — chỉ dùng
  semantic token đã define trong `src/app/tokens.css`.
- Nếu cần token mới → THÊM vào `src/app/tokens.css` trước, map `@theme` ở
  `globals.css`, sync `docs/product/design-system.md`, RỒI mới dùng.
- Legacy handoff = spec hình ảnh/UX, KHÔNG phải kiến trúc (decision `0011`) —
  Clean Architecture + decisions luôn thắng khi xung đột.
- Mọi story chạm UI phải qua design-review gate trước khi đóng (`docs/DESIGN_REVIEW.md`).
- Conflict giữa doc và code runtime → ưu tiên `src/app/tokens.css`.

### Layer rules

| Layer | Directive | Được import | Không được import |
|-------|-----------|-------------|-------------------|
| `domain/` | — | Chỉ types nội bộ | Mọi thứ bên ngoài domain |
| `infrastructure/` | `'server-only'` | `domain/`, `bootstrap/endpoint/`, `bootstrap/lib/http` | React, next/navigation, client libs |
| `bootstrap/di/` | `'server-only'` | `infrastructure/`, `domain/`, `bootstrap/lib/http.server` | Không import trực tiếp từ app/ |
| `presentation/` | `'use client'` | `domain/entities` (types), own `.i-vm.ts`, `shared/utils` | `infrastructure/`, `bootstrap/di/` |
| `app/actions.ts` | `'use server'` | `bootstrap/di/` only | infrastructure/ trực tiếp |
| `app/page.tsx` | RSC | `presentation/`, `./actions` | `bootstrap/di/`, `infrastructure/` |

### Quy tắc đặt tên file

| Loại file | Pattern | Ví dụ |
|-----------|---------|-------|
| Entity | `<name>.entity.ts` | `auth-user.entity.ts` |
| Failure | `<name>.failure.ts` | `auth.failure.ts` |
| Repository interface | `i-<name>.repository.ts` | `i-auth.repository.ts` |
| Use case | `<action>.use-case.ts` | `login.use-case.ts` |
| DTO | `<name>-response.dto.ts` | `login-response.dto.ts` |
| Mapper | `<name>.mapper.ts` | `auth.mapper.ts` |
| DI factory | `<feature>.di.ts` | `auth.di.ts` |
| Endpoint | `<feature>.endpoint.ts` | `auth.endpoint.ts` |
| ViewModel interface | `<component>.i-vm.ts` | `login-form.i-vm.ts` |

### DI pattern (factory per-request)

```ts
// bootstrap/di/auth.di.ts — 'server-only'
export async function makeLoginUseCase() {
  const http = await createServerHttpClient()       // đọc httpOnly cookie
  return new LoginUseCase(new AuthRepository(http)) // wires i-repo → impl
}

// app/[locale]/(auth)/login/actions.ts — 'use server'
export async function loginAction(email: string, password: string) {
  const useCase = await makeLoginUseCase()          // instance mới per request
  const result  = await useCase.execute(email, password)
  // set cookie, redirect — không chạm client bundle
}
```

### Endpoint constants

```ts
// bootstrap/endpoint/auth.endpoint.ts
export const AUTH_EP = {
  login:   '/auth/login',
  logout:  '/auth/logout',
  refresh: '/auth/token/refresh',
  me:      '/auth/me',
} as const

// Dùng trong repository — không magic string:
await this.http.post(AUTH_EP.login, { email, password })
```

### Client bundle guard

- `infrastructure/` và `bootstrap/di/` có `import 'server-only'` — Next.js build **fail ngay** nếu bị import trong Client Component.
- `domain/` entities/types an toàn dùng ở client (pure TypeScript, không runtime).
- Presentation components nhận data qua **props** và **Server Action ref** — không bao giờ import DI hay repo.

## Key Conventions

### Path alias
Use `@/*` for all imports from `src/`. Never use relative paths that cross feature boundaries.

### UI Components
Each shadcn/ui component lives in its own folder with an `index.ts` re-export and a `.stories.tsx`. When adding new components, always use `bun ui:add <name>` — it runs `shadcn add`, organizes files into a folder, and generates the story automatically.

### HTTP / Data Fetching
- `bootstrap/lib/http.ts` — `createHttpClient(token?)` factory. Response interceptor unwraps `response.data` (Axios trả về data trực tiếp, không phải AxiosResponse).
- `bootstrap/lib/http.server.ts` — `createServerHttpClient()` (server-only). Đọc `auth_token` từ httpOnly cookie qua `next/headers`. Chỉ dùng trong `bootstrap/di/`.
- Repositories cast kết quả: `(await this.http.post(...)) as unknown as MyDto` vì interceptor đã unwrap.
- Dùng **TanStack Query** cho client-side caching. Không dùng `useState` cho remote data.

### Shared utilities
- `shared/utils.ts` — `cn()` (clsx + tailwind-merge). Dùng ở mọi layer kể cả UI components.

### Internationalization
Xem `.claude/rules/i18n.md` (decision `0020`). Tóm tắt cứng:
- Tất cả UI strings phải vào `src/bootstrap/i18n/messages/{vi,en}.json` (vi = nguồn
  key duy nhất; en mirror). Thêm key ở cả hai file cùng lúc.
- **Typed**: `messages.d.ts` augment `AppConfig.Messages = typeof vi.json` → `t("key")`
  check compile-time (key sai = fail build). KHÔNG dùng const literal chứa chuỗi.
- **Dịch ở presentation**: `useTranslations()` (client) / `getTranslations()` (server).
  Server Action/use-case/repo trả **key ổn định** (vd `errorKey: Failure["type"]`),
  KHÔNG dịch ở server boundary.
- Mock/seed data + brand noun (`EduPortal`) KHÔNG đưa vào messages.

### Theming
CSS variables defined in `src/app/globals.css` drive the entire design system. Prefer `bg-background`, `text-foreground`, etc. over raw color values. Theme toggling is handled by `next-themes` via `ThemeProvider` in the root layout.

### Commits & Branches
- **Commit format:** `<type>(<scope>): <subject>` — enforced by commitlint + Lefthook.
- **Branch format:** `<type>/<short-desc>` — 1 US = 1 branch `feat/us-eXX.Y-<slug>`
  (xem `.claude/rules/parallel-workflow.md`). VD `feat/us-e12.4-student-roster`.
- `main` and `dev`/`develop` are exempt from branch naming validation.
- Pre-push hook runs the full test suite and `bun build` — do not bypass with `--no-verify`.
- **Parallel branch workflow (decision `0025`):** nhiều phiên `/fe` chạy song song.
  Mỗi US: `git fetch --prune` → claim check + dependency check → tạo branch từ `main`
  rồi **push ngay (early push = claim)** → dev + test trên branch → khi xong & gate
  xanh **auto-merge vào `main`** → **xóa branch (local + remote)**. Chi tiết enforceable:
  `.claude/rules/parallel-workflow.md`.
- **Merge workflow:** auto-merge khi US xong và pre-push gate (test + build) xanh —
  **KHÔNG cần chờ user yêu cầu từng lần** (đổi so với trước, decision `0025`), **KHÔNG
  tạo Pull Request**. Merge `--no-ff` vào `main` rồi xóa branch.
- **Merge commit:** commitlint chặn message "Merge ..." mặc định → merge bằng
  `git merge --no-ff` rồi commit với format conventional
  `chore(<scope>): merge <branch> (<story-ids>)`.

### Pre-commit Hooks (Lefthook)
Three jobs run in parallel on staged `*.ts(x)` files:
1. `biome check --write` — lint + format, auto-stages fixes
2. `tsc --noEmit` — type check
3. `vitest related` — tests related to changed files

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080/api/v1` | Backend API base URL |

## Hard Rules (enforceable detail in `.claude/rules/`)

- **TDD** red→green→refactor; no story `implemented` without real proof (`tdd.md`).
- **Tokens-only** design system — never raw color; new token needs an ADR first (`design-system.md`, `tailwind-v4.md`, `src/app/tokens.css`).
- **WCAG 2.1 AA** is a "done" criterion, not optional (`accessibility.md`).
- **i18n** — all UI strings in `messages/{vi,en}.json` (vi source + en mirror), typed, translated at presentation only (`i18n.md`).
- **Commits & merge**: conventional `<type>(<scope>): <subject>`; 1 US = 1 branch claimed by early push; auto-merge to `main` via `git merge --no-ff` on gate-green then delete the branch (no PR); never `--no-verify` (`parallel-workflow.md`, decision `0025`, §Commits & Branches).
- **Security**: no secrets/PII client-side; no `dangerouslySetInnerHTML`/`eval` on unsanitized input; role-gated destructive UI; validated redirects; tokens stay in httpOnly cookies (server-only), never readable by client.

On any conflict, this file, `.claude/rules/*`, and `src/app/tokens.css` win over docs and prose.
