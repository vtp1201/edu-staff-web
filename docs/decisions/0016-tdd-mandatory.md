# 0016 Test-Driven Development bắt buộc

Date: 2026-06-06

## Status

Accepted

## Context

Trước khi triển khai loạt user story, cần chốt kỷ luật kiểm thử. Repo đã có sẵn
hạ tầng test (Vitest 4, Storybook 10) và pre-commit/pre-push chạy `vitest related`
+ full suite + `bun build` (Lefthook). Nhưng *thứ tự* viết test ↔ code chưa được
quy ước thành rule cứng, dẫn tới rủi ro code-first rồi "bù test", proof yếu
(`docs/TEST_MATRIX.md` chỉ đánh dấu implemented khi có proof).

Clean Architecture per-feature của dự án rất hợp TDD: `domain/use-case` là pure
TypeScript (không framework) → test trước cực rẻ; repository có interface
(`i-*.repository.ts`) → mock dễ ở tầng use-case.

## Decision

**Luôn áp dụng TDD cho mọi story có code** — red → green → refactor:

1. **Red**: viết test thất bại mô tả hành vi mong muốn trước khi viết
   implementation.
2. **Green**: viết lượng code tối thiểu để test xanh.
3. **Refactor**: dọn dẹp khi test còn xanh.

Phạm vi proof bám `docs/TEST_MATRIX.md`:

- **Unit (Vitest)** — `domain/` (use-case, entity, mapper, failure mapping):
  BẮT BUỘC viết test trước. Đây là trọng tâm TDD.
- **Integration** — repository ↔ HTTP boundary, envelope/error mapping
  (decision `0008`), auth/token flow (decision `0018`): test trước ở mức
  contract khi wiring thật.
- **E2E / Story (Storybook + interaction)** — flow UI: state error/empty/loading
  phải có; đi kèm design-review gate (`docs/DESIGN_REVIEW.md`).

Một story chỉ được đóng khi có proof tương ứng (không tự đánh dấu implemented khi
chưa có test/validation — quy tắc `TEST_MATRIX.md`).

## Alternatives Considered

1. **Test-after / "best effort"**: viết test sau khi xong code. Nhanh lúc đầu,
   nhưng proof yếu, dễ bỏ sót edge case, khó refactor an toàn.
2. **Chỉ test tầng domain, bỏ integration/E2E**: rẻ nhưng không bắt được lỗi ở
   boundary (envelope, token refresh, UI state) — nơi nhiều bug thật sự nằm.

## Consequences

Positive:

- Domain pure → test trước gần như không có ma sát; thiết kế use-case rõ ràng hơn.
- Proof gắn liền hành vi → `TEST_MATRIX.md` phản ánh đúng trạng thái.
- Refactor an toàn nhờ lưới test; hợp với Lefthook `vitest related` đã có.

Tradeoffs:

- Chậm hơn ở bước khởi động mỗi story.
- Cần kỷ luật: dễ bị cám dỗ viết code trước cho phần "thấy hiển nhiên".

## Follow-Up

- ✅ Rule enforceable: `.claude/rules/tdd.md`.
- ✅ Chỉ mục `AGENTS.md` trỏ tới rule TDD.
- Khi tạo story packet: thêm hàng `TEST_MATRIX.md` ở trạng thái `planned` TRƯỚC,
  cập nhật `implemented` khi proof tồn tại.
- Đăng ký durable row qua `scripts/bin/harness-cli decision add`.
