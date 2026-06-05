# Architecture (Why & Data Flow)

CLAUDE.md mô tả **cấu trúc** và **rules**. File này giải thích **lý do** chọn
kiến trúc hiện tại và **luồng dữ liệu** end-to-end.

## Vì sao Clean Architecture per-feature

- **Testability**: domain/ là pure TypeScript, test không cần mock framework.
- **Server bundle isolation**: `infrastructure/` và `bootstrap/di/` import
  `'server-only'` → Next.js build fail nếu lỡ import vào Client Component.
  Token, secret, axios server instance không bao giờ leak ra client bundle.
- **Composition root tập trung**: chỉ `bootstrap/di/` biết cách wire concrete
  repository vào use-case. Đổi backend (REST → GraphQL) chỉ sửa 1 file
  infrastructure, không động vào domain/use-case.
- **Per-request DI**: factory `makeXxxUseCase()` chạy lại mỗi request →
  `createServerHttpClient()` đọc cookie httpOnly hiện tại của user. Không có
  singleton chia sẻ giữa users.

## Data Flow (login example)

```
User clicks Login
   │
   ▼
<LoginForm/> (Client Component, presentation/)
   │   onSubmit → formAction(email, pwd)  [prop từ page.tsx]
   ▼
loginAction (Server Action, app/[locale]/(auth)/login/actions.ts)
   │   'use server'
   ▼
makeLoginUseCase()  [bootstrap/di/auth.di.ts, 'server-only']
   │   creates: AuthRepository(http) → LoginUseCase(repo)
   ▼
LoginUseCase.execute(email, pwd)  [features/auth/domain/use-cases/]
   │   orchestration only, no side effect
   ▼
AuthRepository.login(email, pwd)  [features/auth/infrastructure/repositories/]
   │   await http.post(AUTH_EP.login, …) → cast as LoginResponseDto
   ▼
AuthMapper.toEntity(dto)  [features/auth/infrastructure/mappers/]
   │   DTO → AuthUserEntity
   ▼
back to action: setCookie(token, httpOnly), redirect('/dashboard')
```

## Technology Decisions

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | Next.js 16 App Router | RSC, file-based routing, streaming, Server Actions |
| Bundler | Turbopack | Faster dev HMR |
| React Compiler | Enabled | Auto-memoization, tránh viết tay `useMemo`/`useCallback` |
| Styling | Tailwind v4 + CSS variables | Theme dynamic không cần JS, config qua `@theme` directive |
| Components | shadcn/ui (New York) | Composable, own source code, Radix accessibility |
| Server state | TanStack Query v5 | Cache, invalidation, background refetch |
| HTTP | Axios | Interceptor chain để inject token, unwrap `response.data` |
| Server HTTP | `createServerHttpClient()` | Đọc httpOnly cookie qua `next/headers`, không leak token |
| Linting | Biome 2 | One tool thay ESLint + Prettier, nhanh hơn |
| i18n | next-intl v4 | First-class App Router, hỗ trợ Server + Client Component |
| Testing | Vitest + Storybook | Co-located test, story làm visual regression baseline |
| Git hooks | Lefthook | Parallel jobs, yaml config, nhanh hơn Husky |
| Commits | czg + commitlint | Interactive CLI + enforce conventional |

## Multi-tenancy

`src/app/[tenant]/` là placeholder — kiến trúc đã sẵn sàng cho tenant-scoped
routing. Chưa implement logic. Khi cần, thêm middleware resolve tenant và
tenant context vào DI factory.

## Auth Flow

- **Token storage**: `auth_token` lưu trong **httpOnly cookie** (set bởi
  Server Action sau khi login thành công). KHÔNG lưu trong localStorage.
- **Server requests**: `createServerHttpClient()` đọc cookie qua
  `cookies()` từ `next/headers`, inject vào Authorization header.
- **Client requests** (TanStack Query trong Client Component): đi qua API
  route nội bộ hoặc Server Action — KHÔNG gọi backend trực tiếp từ client.
- **Refresh**: 401 interceptor trong `bootstrap/lib/http.server.ts` gọi
  `/auth/token/refresh`, set cookie mới. Nếu refresh fail → redirect login.

## Storybook & Test Strategy

- Mỗi component shadcn/ui có `.stories.tsx` co-located. `bun ui:add` tự gen.
- Storybook chạy chung Vitest qua `@storybook/experimental-addon-vitest` —
  story đóng vai trò vừa visual baseline vừa test entry point.
- Pre-push hook chạy full test + `bun build` — không bypass `--no-verify`.
- Pre-commit (Lefthook) chạy 3 jobs parallel trên file `.ts(x)` đã staged:
  `biome check --write` + `tsc --noEmit` + `vitest related`.