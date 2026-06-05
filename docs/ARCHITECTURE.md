# Architecture — EduPortal (`edu-staff-web`)

Hệ thống quản lý giáo dục đa vai trò (Giáo viên · Hiệu trưởng · Học sinh · Phụ
huynh), định hướng đa tenant. Web client xây bằng **Next.js 16 App Router /
React 19**, tiêu thụ một **REST API riêng** do cùng team sở hữu (mặc định
`http://localhost:8080/api/v1`).

> Tài liệu này là nguồn chân lý về *shape kiến trúc* và *boundary rules*. Quy tắc
> design/UI nằm ở `.claude/CLAUDE.md` + `docs/design/`. Quy trình intake nằm ở
> `docs/FEATURE_INTAKE.md`.

## Stack đã chốt

| Mặt | Lựa chọn | Ghi chú |
| --- | --- | --- |
| Framework | Next.js 16 App Router, React 19 (React Compiler) | RSC + Server Actions |
| Runtime/PM | Bun ≥ 1.1 | dev qua Turbopack |
| UI | shadcn/ui + Radix + Tailwind v4 | tokens trong `globals.css` (`@theme`) |
| i18n | next-intl (`vi` default, `en`) | routes scope dưới `[locale]` |
| Data fetching | TanStack Query v5 + Axios | client cache; không `useState` cho remote data |
| Auth | Cookie httpOnly `auth_token` + Server Actions | xem "Auth & boundary" |
| Backend | REST API riêng, **cùng team sở hữu** | contract đồng bộ chủ động (xem dưới) |
| Test/UI | Vitest 4, Storybook 10 | |
| Lint | Biome | |

**Multi-tenancy** đã chốt hướng **path-first, hybrid-ready** (decision
`0007`): giai đoạn 1 resolve tenant theo path qua `[tenant]`, kiến trúc
`resolveTenant()` + `tenantUrl()` tách riêng để mở subdomain sau. **Deployment
target** vẫn là *open decision* — không hard-code giả định vào code.

## Boundary với backend

Backend là service tách rời nhưng **cùng team sở hữu cả BE lẫn FE**. Hệ quả:

- Contract API được đồng bộ chủ động hai chiều — khi shape response đổi, cập nhật
  song song DTO ở web và ghi một decision nếu đụng public contract.
- Web **không** giả định gọi thẳng DB; mọi truy cập state đi qua REST endpoint
  khai báo trong `bootstrap/endpoint/`.
- **Mock-first swap** (decision `0014`): DI factory chọn repo theo env flag
  `NEXT_PUBLIC_USE_MOCK` qua `bootstrap/lib/mock.ts`:
  `USE_MOCK ? new MockXxxRepository() : new XxxRepository(await createServerHttpClient())`.
  Mock implement đúng interface `i-*.repository.ts` (xem
  `features/attendance/.../mocks/`), nên đổi mock↔real chỉ là một nhánh trong
  factory — use-case/presentation không đổi. Fixtures ở `mocks/fixtures.ts`,
  `mockDelay()` giả lập latency.

## Clean Architecture — per feature

Hướng phụ thuộc, inner layer không biết gì về outer:

```text
domain  ←  infrastructure  ←  bootstrap/di  ←  app/actions  ←  app/page
                                            ←  presentation (Client Components)
```

Mỗi domain là một folder dưới `src/features/<feature>/` (hiện có: `auth`,
`attendance`, và `user` đang trống). Cấu trúc một feature:

```text
features/<feature>/
  domain/                 # INNERMOST — pure TS, zero framework/lib deps
    entities/             #   <name>.entity.ts
    failures/             #   <name>.failure.ts — typed error union
    repositories/         #   i-<name>.repository.ts — interface (DIP)
    use-cases/            #   <action>.use-case.ts (+ .test.ts cùng chỗ)
  infrastructure/         # SERVER ONLY — 'server-only' bắt buộc
    dtos/                 #   <name>-response.dto.ts — shape API
    mappers/              #   <name>.mapper.ts — DTO → Entity
    repositories/         #   <name>.repository.ts — implements i-<name>
      mocks/              #   <name>.mock.repository.ts + fixtures.ts
  presentation/           # UI only — không import infrastructure / di
    <component>/
      <component>.i-vm.ts #   ViewModel interface (contract server↔client)
      <component>.tsx     #   'use client' — nhận VM props + action prop
```

Wiring tập trung ở `src/bootstrap/`: `di/` (composition root, server-only
factory `makeXxxUseCase()`), `endpoint/` (URL constants, tránh magic string),
`lib/` (http client, react-query provider), `i18n/`.

## Dependency Rule

Inner không phụ thuộc outer. Vi phạm = build fail (nhờ `import 'server-only'`).

| Layer | Directive | Được import | KHÔNG được import |
| --- | --- | --- | --- |
| `domain/` | — | chỉ types nội bộ + pure utils nhỏ | framework, http, React, next/* |
| `infrastructure/` | `'server-only'` | `domain/`, `bootstrap/endpoint/`, `bootstrap/lib/http` | React, next/navigation, client libs |
| `bootstrap/di/` | `'server-only'` | `infrastructure/`, `domain/`, `bootstrap/lib/http.server` | thẳng từ `app/` |
| `presentation/` | `'use client'` | `domain/entities` (types), own `.i-vm.ts`, `shared/utils` | `infrastructure/`, `bootstrap/di/` |
| `app/actions.ts` | `'use server'` | `bootstrap/di/` only | `infrastructure/` trực tiếp |
| `app/page.tsx` | RSC | `presentation/`, `./actions` | `bootstrap/di/`, `infrastructure/` |

## Parse-First Boundary Rule

Dữ liệu lạ phải được parse/map ở boundary trước khi vào inner code. Trong dự án
này boundary cụ thể là:

- Response từ REST API → **DTO** (`*-response.dto.ts`) rồi qua **mapper** →
  **Entity**. Inner code chỉ làm việc với Entity, không bao giờ chạm DTO thô.
- Form input + Server Action args → validate trong action/use-case trước khi
  thành command.
- httpOnly cookie `auth_token` → đọc ở `http.server.ts` (server-only), không lộ
  ra client bundle.
- Env (`NEXT_PUBLIC_API_URL`) → đọc ở `bootstrap/lib`.

```text
API JSON (unknown)
  -> DTO (infrastructure/dtos)
  -> mapper (infrastructure/mappers)
  -> Entity (domain/entities)
  -> use-case (domain/use-cases)
```

Dùng product type có nghĩa (`AuthUser`, `AttendanceRoster`, `ClassPeriod`,
`AttendanceStatus`, role enum) thay vì truyền string thô qua các layer.

## Auth & Authorization

- **Auth**: login qua Server Action → set cookie httpOnly `auth_token`. Mọi
  request server-side đọc token qua `createServerHttpClient()`. Đây là *hard
  gate* trong intake — thay đổi luồng auth luôn là high-risk.
- **Authorization (RBAC)**: 4 role — `teacher`, `principal`, `student`,
  `parent`. Route được phân theo role group dưới `app/[locale]/(app)/<role>/`.
  Khi multi-tenancy được chốt, authorization sẽ thêm trục tenant/company scope —
  ghi decision khi quyết định.

## Routing & Surfaces

Surface hiện tại: **browser web app** (chưa có mobile/desktop/CLI). Cấu trúc
route:

```text
app/[locale]/
  (auth)/login/            # page.tsx (RSC) + actions.ts ('use server')
  (app)/
    (shared)/profile/
    teacher/   ( + teacher/attendance/ )
    principal/
    student/
    parent/
app/[tenant]/              # placeholder cho multi-tenancy — cơ chế CHƯA chốt
```

## Command/Query

Reads và writes tách rõ ở mức use-case: `get-roster`, `list-my-classes`,
`list-attendance-history` (queries) vs `save-attendance` (command, sở hữu side
effect). Shared rule sống ở domain/use-case, không ở component hay action.

## Naming (tóm tắt)

| Loại | Pattern |
| --- | --- |
| Entity | `<name>.entity.ts` |
| Failure | `<name>.failure.ts` |
| Repo interface | `i-<name>.repository.ts` |
| Use case | `<action>.use-case.ts` |
| DTO | `<name>-response.dto.ts` |
| Mapper | `<name>.mapper.ts` |
| DI factory | `<feature>.di.ts` |
| Endpoint | `<feature>.endpoint.ts` |
| ViewModel | `<component>.i-vm.ts` |

## Validation Ladder

| Layer | Hiện trạng | Công cụ |
| --- | --- | --- |
| Unit (use-case) | có (vd `save-attendance.use-case.test.ts`) | Vitest |
| Component | Storybook stories per UI primitive | Storybook + Vitest browser |
| Type | `tsc --noEmit` (pre-commit) | TypeScript |
| Build/E2E | `next build` ở pre-push; E2E chưa có | — |

## Open Decisions

- **Deployment target**: Vercel vs self-hosted Node/Docker. → ảnh hưởng caching,
  env, runtime config. Ghi vào `docs/decisions/` khi chốt.

Đã chốt: **Multi-tenancy** → path-first, hybrid-ready (decision `0007`).
