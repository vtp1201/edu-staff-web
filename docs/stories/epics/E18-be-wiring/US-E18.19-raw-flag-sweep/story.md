# US-E18.19 Sweep raw-flag placement — hoist `raw: true` khỏi `params` + regression guard

## Status

implemented

## Lane

tiny

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/principal/infrastructure/teachers/`,
  `src/features/class-log/infrastructure/`,
  `src/features/admin/subject-catalogue/infrastructure/`,
  `src/features/admin/class-management/infrastructure/`,
  `src/features/admin-roster/infrastructure/`,
  `src/features/teacher/infrastructure/` (2 repo)
- Shared contract/file: `src/bootstrap/lib/http.ts` + `src/bootstrap/lib/api-envelope.ts`
  (`isRawCall`/`unwrapResponse` đọc `config.raw` TOP-LEVEL, không đọc trong `params`)

## Bug class

`isRawCall` trong `bootstrap/lib/api-envelope.ts` chỉ đọc `config.raw` ở top-level
của axios request config. Khi repository đặt `raw: true` **nested trong `params`**
(vd `params: { raw: true }` hoặc `params: { ...fields, raw: true }`), interceptor
KHÔNG thấy `config.raw` → tưởng đây là call cần unwrap bình thường → unwrap luôn ở
tầng interceptor → repository nhận về `payload` (đã unwrap) thay vì full envelope →
gọi tiếp `parseEnvelope(payload)` → `payload.success` luôn `undefined` (falsy) →
`parseEnvelope` throw `ApiError({ code: "UNKNOWN_ERROR" })` cho MỌI list call thật
(real/non-mock mode). Unit test mock `http.get` trực tiếp (không chạy qua
interceptor thật) nên KHÔNG bắt được bug này.

Phát hiện + fix lần đầu ở cụm staffing (US-E18.2) — tạo pattern regression-guard:
describe `"<Repo> — real interceptor pipeline (raw-flag placement)"` trong file
test của repo, import `unwrapResponse` THẬT từ `@/bootstrap/lib/api-envelope`,
mock `http.get` để tự chạy qua `unwrapResponse` (mô phỏng interceptor thật) trước
khi trả về repo — nếu `raw` nested sai vị trí, test đỏ ngay.

## Sweep kết quả (grep `raw: true` khắp `src/features`, loại `test`/`mock`)

### Sites lỗi — cần hoist raw lên sibling top-level của `params` (9 sites / 7 repo)

1. `src/features/principal/infrastructure/teachers/repositories/principal-teachers.repository.ts:55,67`
2. `src/features/class-log/infrastructure/repositories/class-log.repository.ts:75`
3. `src/features/admin/subject-catalogue/infrastructure/repositories/subject-catalogue.repository.ts:120,186`
4. `src/features/admin/class-management/infrastructure/repositories/class-management.repository.ts:66`
5. `src/features/admin-roster/infrastructure/repositories/roster.repository.ts:38,52` (CẢ HAI method —
   `getClasses` line 38 **cũng lỗi**, khác với giả định ban đầu là chỉ line 52 sai;
   verify code thực tế đã xác nhận nested trong cả hai)
6. `src/features/teacher/infrastructure/repositories/teacher-class.repository.ts:69` (`fetchAllPages`)
7. `src/features/teacher/infrastructure/repositories/teacher-dashboard.repository.ts:66` (`fetchAllPages`)

### Sites verify-only — đã ĐÚNG top-level, không sửa (2 repo)

- `src/features/notification/infrastructure/repositories/notification.repository.ts:63` —
  `{ params: queryParams, ...({ raw: true } as Record<string, unknown>) }` — spread
  sibling của `params`, đúng.
- `src/features/audit-log/infrastructure/repositories/audit-log.repository.ts:85` — cùng
  pattern, đúng.
- (Tham chiếu đã fix trước: `calendar.repository.ts`, `staffing.repository.ts` — US-E18.1/E18.2.)

## Acceptance Criteria

- Với mỗi 7 repo lỗi: thêm regression-guard describe chạy `unwrapResponse` thật →
  red trước khi sửa (xác nhận bug tồn tại) → hoist `raw: true` thành sibling
  top-level của `params` trong axios config → guard xanh.
- KHÔNG đổi DTO, error-mapping, hay query params thực (fromDate/cursor/limit/parentId…)
  — chỉ đổi vị trí flag.
- notification + audit-log: thêm guard tương tự để xác nhận (regression-proof) dù
  không cần sửa code — bảo vệ khỏi regression sau này.
- Toàn bộ test suite xanh + `tsc --noEmit` + `bun run build` xanh.

## Design Notes

- Commands: none (không đổi domain/use-case)
- Queries: không đổi
- API: không đổi contract, chỉ đổi vị trí flag nội bộ trong axios config
- Tables: n/a
- Domain rules: n/a — thuần infrastructure/repository layer
- UI surfaces: none (không chạm UI → không cần design-review/a11y gate)

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Regression-guard describe "real interceptor pipeline (raw-flag placement)" mỗi repo (7 fix + 2 verify) — red→green cho 7 repo sửa, green ngay cho 2 repo verify |
| Integration | n/a (unit-level guard đã mô phỏng interceptor thật) |
| E2E | n/a (lane tiny, không đổi UI/flow) |
| Platform | `tsc --noEmit`, `bun run build` xanh |
| Release | full `bun vitest run` xanh, pre-push gate xanh, auto-merge vào `main` |

## Evidence

- Regression-guard `describe("… real interceptor pipeline (raw-flag placement)")` added to all 9 repos' test files (7 fixed + 2 verify-only), piping mocked `http.get` through the REAL `unwrapResponse` from `@/bootstrap/lib/api-envelope` — confirmed red against the old nested-raw source, green after each fix.
- Full suite: `bun vitest run` → 246 files / 1357 tests pass (zero regression).
- `bunx tsc --noEmit` → clean.
- `bun run build` → success (all routes compiled).
- `fe-tech-lead-reviewer` verdict: **Approved**. Verified every fixed repo hoists `raw: true` to a sibling of `params` with no query-value changes, guards genuinely exercise the real `unwrapResponse`, no scope creep (only `*.repository.ts` + `*.repository.test.ts` + agent-memory touched), and re-ran a fresh grep confirming no repo under `src/features` still nests `raw` inside `params` — sweep is complete.
- No UI touched → design-review / a11y gate not applicable for this story (infrastructure-only, tiny lane).

## Harness Delta

- `harness-cli story add --id US-E18.19 --lane tiny` (packet này).
- `harness-cli story update --id US-E18.19 --status implemented --unit 1 --integration 0 --e2e 0 --platform 1` sau khi gate xanh.
- `docs/TEST_MATRIX.md` — thêm hàng US-E18.19 (unit proof qua regression guard).
