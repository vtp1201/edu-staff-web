# 0017 BE Service Map (5 services) & Web Boundary Alignment

Date: 2026-06-06

## Status

Accepted

## Context

BE (`edu-api`, cùng team sở hữu) tách thành các microservice độc lập, mỗi service
một bounded context (DDD) + hexagonal, giao tiếp async qua RabbitMQ. Web hiện chỉ
wiring rải rác (mới có `auth`), `bootstrap/endpoint/` + `bootstrap/di/` chưa phản
ánh ranh giới service của BE. Cần chốt **bản đồ service** để web tổ chức
endpoint/DI/feature folder bám đúng owner, tránh gọi chéo service sai chỗ và để
biết `INTEGRATION.md`/`openapi.yaml` nào là source of truth khi wiring từng
feature (rule `.claude/rules/api-integration.md`).

Nguồn: `edu-api/AGENTS.md` khai báo 5 service. **Lưu ý lệch tên**: nội bộ team
quen gọi service nhắn tin là **`chat`**, nhưng BE đặt tên service là **`social`**
(*"Messaging + lightweight social network"*). Tên service chuẩn theo BE.

## Decision

Chốt **5 service BE** (tên chuẩn theo `edu-api`) làm ranh giới tham chiếu cho web:

| Service BE | Bounded context | Web tiêu thụ |
| --- | --- | --- |
| `iam` | Identity & Access (user, member, tenant, auth) | auth, tenant, member, profile |
| `core` | School operations (school, class, conduct, academic records) | teacher/student/principal data, lớp học, hạnh kiểm, học bạ |
| `lms` | Digital learning (dạy học số) | bài giảng số, assignment, nội dung học |
| `noti` | Event fan-out + delivery (email, Firebase push) | realtime/thông báo (SSE proxy — decision `0009`) |
| `social` | Messaging + lightweight social network | chat/tin nhắn, social feed |

Quy ước cho web:

- **Naming**: dùng tên service chuẩn BE. `chat` (cách gọi nội bộ) **map →
  `social`**. Endpoint/DI/feature folder đặt theo service đích.
- **Một service ↔ một nhóm endpoint** trong `bootstrap/endpoint/<service>.endpoint.ts`;
  DI factory `bootstrap/di/<feature>.di.ts` chỉ wiring repo của đúng service.
- **Mỗi service một base/contract**: trước khi wiring một feature, đọc
  `services/<svc>/docs/INTEGRATION.md` + `openapi.yaml` của service đó (rule
  api-integration). Hiện BE mới có `iam` + `notification`; `core`/`lms`/`social`
  **chưa tồn tại** → web đi mock-first (decision `0014`) hoặc contract-first
  (như SSE decision `0009`) cho tới khi service lên.
- Web **không** gộp nhiều service vào một repository; cross-service ghép ở tầng
  use-case/presentation, không ở HTTP layer.

## Alternatives Considered

1. **Một BE đơn khối, web không phân service**: đơn giản hoá phía web nhưng sai
   thực tế BE (đã là microservice) → endpoint/error/versioning sẽ lệch.
2. **Web tự đặt tên service riêng (`chat`)**: dễ đọc nội bộ nhưng lệch
   `INTEGRATION.md`/`openapi.yaml` của BE → ma sát khi đối chiếu contract.

## Consequences

Positive:

- `bootstrap/endpoint` + `bootstrap/di` ánh xạ 1-1 với owner BE → dễ tìm source
  of truth, dễ versioning theo service.
- Tên thống nhất hai repo → giảm nhầm lẫn khi pull `openapi.yaml`.

Tradeoffs:

- Cross-service feature (vd dashboard gộp core + lms + noti) phải ghép ở tầng
  trên, không có một endpoint "gộp sẵn".
- Service chưa tồn tại → web phải mock/contract-first và đồng bộ lại sau (nợ cần
  theo dõi).

## Follow-Up

- ✅ Bổ sung "Service map" vào `.claude/rules/api-integration.md`.
- Khi tạo feature mới: đặt `endpoint`/`di`/feature folder theo service đích;
  ghi decision nếu phát hiện lệch contract với `openapi.yaml`.
- `social`/`core`/`lms` lên thật → đối chiếu `INTEGRATION.md`, gỡ mock, ghi
  decision nếu public contract đổi.
- Đăng ký durable row qua `scripts/bin/harness-cli decision add`.
