# Rule: Test-Driven Development (bắt buộc)

Mọi story có code đi theo TDD **red → green → refactor** (decision `0016`).

## Vòng lặp

1. **Red** — viết test thất bại mô tả hành vi mong muốn TRƯỚC khi viết code.
2. **Green** — viết lượng code tối thiểu để test xanh.
3. **Refactor** — dọn dẹp khi test còn xanh; không thêm hành vi mới ở bước này.

## Tầng proof (bám `docs/TEST_MATRIX.md`)

| Tầng | Phạm vi | Yêu cầu |
| --- | --- | --- |
| **Unit (Vitest)** | `domain/` — use-case, entity, mapper, failure mapping | Viết test TRƯỚC. Trọng tâm TDD (domain pure, không framework → rẻ). |
| **Integration** | repository ↔ HTTP boundary, envelope/error mapping (decision `0008`), token/auth flow (decision `0018`) | Test ở mức contract khi wiring thật. |
| **E2E / Story** | flow UI (Storybook + interaction) | State error/empty/loading bắt buộc; kèm design-review gate. |

## Quy tắc cứng

- KHÔNG đánh dấu một story `implemented` trong `docs/TEST_MATRIX.md` khi chưa có
  proof (test/validation) tồn tại.
- Khi tạo story packet: thêm hàng `TEST_MATRIX.md` ở `planned` TRƯỚC khi code.
- Mock repository qua interface `i-<name>.repository.ts` để test use-case không
  chạm HTTP thật.
- KHÔNG bypass Lefthook (`vitest related`, `tsc`, `biome`) bằng `--no-verify`.
- Test phải xác định (deterministic): không phụ thuộc `Date.now()` thật / thứ tự
  chạy — inject clock/seed khi cần (vd skew của token, decision `0018`).

## Liên quan

- Hạ tầng: Vitest 4, Storybook 10; pre-commit/pre-push chạy test (xem `.claude/CLAUDE.md`).
- `docs/TEST_MATRIX.md` — map hành vi → proof.
- Decision `0016` (TDD), `0008` (envelope), `0018` (token).
