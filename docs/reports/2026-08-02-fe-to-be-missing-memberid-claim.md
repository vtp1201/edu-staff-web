# FE → BE (2026-08-02): token tenant-scoped thiếu claim `memberId` → mọi màn TEACHER gọi core bị 403

## Triệu chứng

Đăng nhập thật (`giaovien@demo.local`, tenant `aeb0e462-…`, roles `["TEACHER"]`),
switch-tenant OK, nhưng **mọi** endpoint core nhánh teacher trả 403:

```
GET /core/api/v1/classes  (Bearer <tenant-scoped token>)
→ 403 {"error":{"code":"CLASS_FORBIDDEN","message":"You do not have permission to manage classes"}}
```

Ảnh hưởng: toàn bộ màn GV trên web (attendance, dashboard, classes, …) rơi vào
error state khi chạy `NEXT_PUBLIC_USE_MOCK=false`.

## Root cause (đã trace tới code IAM)

1. Token tenant-scoped sau `POST /members/switch-tenant` decode ra:
   `userId`, `tenantId`, `memberRoles:["TEACHER"]` — **KHÔNG có `memberId`**.
2. `services/iam/.../usecase/session_issuer.go` → `claimsFor()` set
   `TenantID`/`MemberRoles`/`MemberPermissions` khi có scope nhưng **không bao
   giờ set `claims.MemberID`** (field có sẵn trong
   `pkg/kit/auth/claims.go:33`).
3. Kong `edu-edge-auth` (`handler.lua:178`) chỉ copy `memberId` nếu JWT có → X-Edu-Claims không có.
4. Core `services/core/internal/class/adapter/http/helpers.go` → `actorFrom()`
   đọc `claims.MemberID` = "" → nhánh TEACHER trong
   `usecase/list_classes.go:81-84`: `NewMemberID("")` fail →
   `ErrClassForbidden()`.

Nhánh ADMIN/MANAGER không cần memberID nên không dính (giải thích vì sao US-164
Principal Classes hết 403 nhưng TEACHER vẫn 403).

## Ask

- IAM mint `memberId` vào access-token claims khi issue tenant-scoped session
  (trong IAM, memberId == userId — xem `batch_get_members.go:74`
  `MemberID: m.UserID().String()`), HOẶC core fallback `MemberID → UserID`
  khi claim vắng. Phía nào là chủ đích thì BE quyết — FE chỉ cần nhánh
  TEACHER của `list_classes`/`roster`/`attendance` hoạt động với token thật.

## FE đã làm gì trong lúc chờ

- `error.tsx` boundary cho `(app)` workspace: 403/5xx render error state +
  retry thay vì crash (commit trên edu-staff-web `main`).
- Repro script: signin → switch-tenant → `GET /core/api/v1/classes` (curl,
  xem trên) — chạy lại được ngay khi BE vá để verify.
