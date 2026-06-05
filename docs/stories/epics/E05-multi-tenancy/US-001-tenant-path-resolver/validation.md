# Validation — US-E05.1 Tenant Path Resolver

## Proof Strategy

Story xong khi: (1) `resolveTenant` resolve đúng theo path và trả `null` đúng
lúc; (2) user không thể vào tenant ngoài membership; (3) link nội bộ luôn mang
tenant; (4) `next build` xanh.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | `resolveTenant`: path hợp lệ → tenant; path thiếu → null; host luôn null (phase 1); `tenantUrl` sinh đúng path-form |
| Integration | middleware: request có/không tenant → rewrite/redirect đúng; guard: user có role trong tenant → pass, không có → 403/redirect |
| E2E | login (1 role) → vào đúng `/{tenant}/{role}`; truy cập tenant lạ qua URL → bị chặn |
| Platform | `next build` xanh; next-intl matcher không vỡ |
| Performance | resolver chạy trong middleware, không thêm round-trip BE thừa mỗi request |
| Logs/Audit | middleware log `tenantId` + `requestId` cho cross-tenant attempt |

## Fixtures

- User A: membership `teacher@tenant-acme`.
- User B (multi): `teacher@tenant-acme` + `parent@tenant-beta`.
- Tenant `acme` (active), `beta` (active), `ghost` (không tồn tại).

## Commands

```text
TBD — bun vitest run (unit/integration), bun build (platform)
```

## Acceptance Evidence

Add results after verification.
