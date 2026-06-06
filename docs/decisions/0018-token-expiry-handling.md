# 0018 Xử lý accessToken hết hạn — Hybrid (reactive-first + proactive exp-check)

Date: 2026-06-06

## Status

Accepted

## Context

Web giữ `accessToken` trong **cookie httpOnly** (`auth_token`), đọc server-side
qua `next/headers` (`bootstrap/lib/http.server.ts`). Hệ quả ràng buộc:

- **Client JS không đọc được token → không đọc được `exp`.** Mọi việc kiểm tra
  hết hạn chỉ làm được **server-side**.
- BE (edu-api decision `0012`) dùng **refresh-token rotation + reuse detection**:
  session có thể **bị thu hồi TRƯỚC khi token hết hạn** (reuse ⇒ revoke cả
  session). Cộng với clock skew → kể cả khi exp "còn hạn", request vẫn có thể
  nhận `401 TOKEN_EXPIRED`/`INVALID_TOKEN`.
- BE flow: `401 TOKEN_EXPIRED → POST /auth/refresh` trả cặp token mới (RT
  **rotated** — lưu cái mới, bỏ cái cũ).
- Hiện trạng web: `bootstrap/lib/http.ts` interceptor mới chỉ có `// TODO` ở
  nhánh 401 — refresh **chưa wiring**.

Câu hỏi đặt ra: có nên **luôn check `exp` trước khi gọi** và **lưu `exp` thành
biến** cho dễ truy xuất?

## Decision

**Hybrid — reactive-first là nguồn chân lý, proactive exp-check là lớp tối ưu
(server-side).**

1. **Reactive (BẮT BUỘC, safety net):** interceptor 401 trong `http.ts` bắt
   `error.code === 'TOKEN_EXPIRED'` → gọi `/auth/refresh` → **retry đúng 1 lần**
   với token mới. Đây là cơ chế **không thể bỏ** vì session có thể bị revoke sớm
   và clock có thể lệch — exp-check không bao giờ thay thế được.
2. **Proactive (tối ưu, server-side):** lưu `exp` cạnh token để pre-empt refresh
   trước khi gọi, tránh round-trip 401 thừa:
   - Khi set cookie `auth_token`, set thêm **sibling cookie `auth_token_exp`**
     (decode `exp` từ JWT một lần ở boundary login/refresh).
   - Helper `bootstrap/lib/auth-token.server.ts`: `getAccessToken()` trả
     `{ token, exp }`; `isAccessExpired(exp, skew = 30)` so `exp*1000 <=
     Date.now() + skew*1000`.
   - DI factory: nếu `isAccessExpired(exp)` → refresh trước **rồi** tạo
     `createHttpClient(token)`.

"**Lưu exp thành biến**" = lưu **server-side** (sibling cookie), truy xuất qua
accessor có kiểu — KHÔNG lưu token/exp ở nơi client đọc được, KHÔNG check exp ở
client.

Refresh phải **single-flight** (gộp các request đồng thời vào một lần refresh) để
tránh nhiều refresh song song làm rotation đá nhau (reuse detection của BE).

## Alternatives Considered

1. **Reactive-only (chỉ 401→refresh→retry):** đơn giản nhất, đúng contract BE.
   Bỏ vì mỗi lần token vừa hết hạn tốn thêm 1 round-trip (gọi hỏng → refresh →
   gọi lại) — chấp nhận được nhưng kém tối ưu cho màn nhiều request.
2. **Proactive-only (luôn check exp, 401 chỉ fallback tối thiểu):** sát đề xuất
   ban đầu. Bỏ vì vẫn buộc giữ nhánh 401 (revoke sớm/skew) → không bớt được code,
   lại decode/branch ở mọi request.
3. **Check exp ở client:** bất khả thi — cookie httpOnly, client không đọc được.

## Consequences

Positive:

- An toàn tuyệt đối nhờ lưới 401 (kể cả revoke sớm, skew); proactive cắt được
  round-trip thừa ở happy path.
- Token/exp không bao giờ lộ ra client; bám đúng mô hình cookie server-only +
  decision `0009`.

Tradeoffs:

- Thêm sibling cookie `auth_token_exp` phải set/xoá đồng bộ với `auth_token`
  (login, refresh, signout).
- Cần single-flight refresh + giữ skew buffer hợp lý (mặc định 30s) để tránh
  false-positive hết hạn và refresh dồn.

## Follow-Up

- Story (high-risk, Auth hard gate) khi wiring auth thật:
  - `bootstrap/lib/auth-token.server.ts` (`getAccessToken`, `isAccessExpired`).
  - Interceptor 401 → refresh → retry-once + single-flight trong `http.ts`.
  - Set/clear `auth_token` + `auth_token_exp` ở login/refresh/signout.
  - TDD (decision `0016`): test trước cho expired/skew/revoke/single-flight.
- Đồng bộ tên endpoint auth với IAM (mismatch đã ghi ở
  `.claude/rules/api-integration.md`): `/auth/signin|signout|refresh`, `/users/me`.
- ✅ Cập nhật `.claude/rules/api-integration.md` (Auth flow → hybrid).
- Đăng ký durable row qua `scripts/bin/harness-cli decision add`.
