# Spec Intake — EduPortal

Date: 2026-06-05

## Source

Where did the spec come from?

- User prompt: khởi tạo harness trên repo `edu-staff-web` đang có sẵn code.
- Attached file: —
- External reference: `README.md`, `.claude/CLAUDE.md`, source dưới `src/`.

Intake này được suy ra ngược (reverse-intake) từ codebase đang chạy + xác nhận
định hướng với product owner, không phải từ một spec văn bản đầy đủ.

## Project Summary

**EduPortal** — hệ thống quản lý giáo dục đa vai trò cho trường học, định hướng
đa tenant. Bốn nhóm người dùng: **Giáo viên**, **Hiệu trưởng**, **Học sinh**,
**Phụ huynh**. Web app (Next.js 16) tiêu thụ REST API riêng do cùng team sở hữu.
Vertical slice đầu tiên đã chạy được: **điểm danh của giáo viên** (attendance).

## Candidate Product Docs

Các file product contract dưới `docs/product/` (đã tách từ codebase):

| File | Purpose | Status |
| --- | --- | --- |
| `docs/product/overview.md` | Tổng quan sản phẩm, roles, giá trị | created |
| `docs/product/roles-permissions.md` | RBAC: 4 role + tenant-scoped role | created |
| `docs/product/attendance.md` | Hợp đồng nghiệp vụ điểm danh: roster, status, history | created |
| `docs/product/auth.md` | Luồng login/session, cookie model, failure types | created |
| `docs/product/api-conventions.md` | DTO↔Entity, endpoint, typed failure, DI | created |
| `docs/product/realtime-events.md` | SSE contract (web-defined, BE follow) | created |

## Candidate Epics

Chỉ liệt kê epic đủ rõ để đặt tên. Chưa cắt mọi story.

| Epic | Description | Status |
| --- | --- | --- |
| E01 | Auth & RBAC — login, SSO, select-role, forgot-pw, session httpOnly | partial (login email có) |
| E02 | Class Ops — Attendance (✅) + Class Log (sổ đầu bài) | in-progress |
| E03 | Principal dashboard — overview, teachers, reports | unsliced |
| E04 | Student & Parent portal — overview, grades, schedule | unsliced |
| E05 | Multi-tenancy — resolve tenant + scope dữ liệu | unblocked (decision 0007: path-first) |
| E06 | BE Integration Foundation — envelope parser, SSE realtime | sliced |
| E07 | Design System Foundation — tokens, a11y, Storybook, impeccable gate | sliced (token fix done) |
| E08 | App Shell & Navigation — sidebar/header/profile | unsliced |
| E09 | Discipline — vi phạm / hạnh kiểm / nghỉ phép | unsliced |
| E10 | Messaging — chat 1:1 + group (realtime qua SSE) | unsliced |
| E11 | Student LMS + Exams — courses/assignments/resources + thi online | unsliced |

Design-driven epics (E07–E11) bắt nguồn từ legacy handoff (decision `0011`) +
screen inventory `docs/product/screens.md`. Tất cả UI tuân design-review gate
(`docs/DESIGN_REVIEW.md`).

## Architecture Questions

- **Runtime stack**: Next.js 16 App Router + React 19, Bun, Tailwind v4,
  shadcn/ui, TanStack Query + Axios. (đã chốt)
- **Product surfaces**: browser web app. Chưa có mobile/desktop/CLI.
- **Storage**: không truy cập DB trực tiếp — qua REST API riêng (cùng team sở
  hữu). Feature chưa có backend dùng mock repository.
- **External providers**: chưa có (no email/payment/queue provider tại thời
  điểm này).
- **Deployment target**: **CHƯA quyết định** (Vercel vs self-hosted Node/Docker)
  → open decision.
- **Security model**: cookie httpOnly `auth_token` + Server Actions; `server-only`
  guard chặn rò rỉ infra/DI vào client bundle; RBAC theo 4 role; tenant scope sẽ
  thêm khi multi-tenancy chốt.

## Validation Shape

| Layer | Expected proof |
| --- | --- |
| Unit | Use-case tests (Vitest) — đã có cho attendance; mở rộng cho auth & các use-case mới |
| Integration | Repository ↔ mapper với fixture; chưa có riêng |
| E2E | Chưa có — cần thêm cho luồng login + điểm danh end-to-end |
| Platform | `next build` chạy ở pre-push |
| Release | Lefthook (Biome + tsc + vitest related pre-commit; build + test pre-push) |

## Open Decisions

- **Deployment target**: Vercel vs self-hosted Node/Docker. → ảnh hưởng caching,
  runtime config, env handling.

Đã chốt: **Multi-tenancy** → path-first, hybrid-ready (decision `0007`).

## First Story Candidates

- E01: hardening luồng login + logout + bảo vệ route theo role (RBAC guard).
- E02: hoàn thiện save-attendance với real repository khi backend sẵn sàng; xử lý
  edge case roster rỗng / period đã chốt sổ.
- E03: story đầu tiên cho Principal dashboard (chọn 1 widget có giá trị rõ).

## Harness Delta

- Định nghĩa lại `docs/ARCHITECTURE.md` từ template generic → mô tả stack & boundary
  thực tế của EduPortal.
- Khởi tạo `docs/product/spec-intake.md` này từ reverse-intake.
- Cần tiếp: tạo `docs/decisions/` entry cho 2 open decision (multi-tenancy,
  deployment) khi chốt; tách product docs theo bảng "Candidate Product Docs".
