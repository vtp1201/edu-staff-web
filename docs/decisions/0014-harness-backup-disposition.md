# 0014 Harness Backup Disposition + Mock-First Pattern

Date: 2026-06-06

## Status

Accepted

## Context

Harness install (`--override --yes`) đã di chuyển nhiều file gốc vào
`.harness-backup/20260605214808/`. Cần duyệt và quyết giữ/bỏ; thứ giữ phải gắn
lại vào harness/epic/US thay vì để chết trong backup. Quá trình này phát hiện
thêm reference gãy (giống bug `docs/design/tokens.css` ở decision `0010`).

## Decision

| Backup item | Verdict | Hành động |
| --- | --- | --- |
| `scripts/ui-add.sh` | **Restore** | `package.json` `ui:add` + CLAUDE.md tham chiếu → đã gãy. Khôi phục về `scripts/`, `chmod +x`. |
| `scripts/generate-story.ts` | **Restore** | ui-add.sh gọi nó để sinh Storybook story cho shadcn component. Khôi phục. (KHÁC `harness-cli story` — cái đó là product story.) |
| `docs/design/design-spec.jsonc` | **Keep → relocate** | Spec layout per-screen (login, dashboards, exam, profile, discipline…) rất chi tiết. Chuyển → `docs/product/design-spec.jsonc`, normative cho layout (decision `0011`). Tham chiếu từ `.claude/rules/design-system.md` + `screens.md`. |
| `docs/design/{design-system.md,design.md,tokens.css}` | Đã xử lý ở `0010` | tokens.css → `src/app/tokens.css`; nội dung → rules + product docs. |
| `docs/features.md` | **Discard** | Rỗng (0 nội dung); thay bằng `docs/product/*` + `screens.md`. |
| `docs/brainstorms/…sprint1.md` | **Extract, leave in backup** | `docs/brainstorms` bị `.gitignore` (commit `c1c0629`). Trích giá trị durable (dưới); file gốc để lại trong backup làm tham khảo. |

### Mock-first pattern (trích từ brainstorm — đã wired thật)

Xác nhận đang chạy: `bootstrap/lib/mock.ts` export `USE_MOCK =
process.env.NEXT_PUBLIC_USE_MOCK === "true"` + `mockDelay()`. DI factory:
`USE_MOCK ? new MockXxxRepository() : new XxxRepository(await createServerHttpClient())`
(xem `bootstrap/di/attendance.di.ts`). `.env.local` hiện `NEXT_PUBLIC_USE_MOCK=true`.
→ Chuẩn hoá thành convention: mọi feature chưa có BE dùng mock-first, swap qua env
flag, mock implement đúng `i-*.repository.ts`. Ghi vào `docs/ARCHITECTURE.md` + AGENTS.md.

### App-shell plan (trích từ brainstorm)

Chuyển vào story `E08-app-shell/US-001-app-shell.md` (nav-config data-driven,
role-switcher, role-guard, Plus Jakarta Sans next/font) — không để mất trong backup.

## Consequences

Positive:

- `bun ui:add` hoạt động lại; spec per-screen + mock pattern được ghi nhận chính thức.
- Giá trị backup không bị mất; thứ bỏ là thứ rỗng/đã thay thế.

Tradeoffs:

- `.harness-backup/` vẫn giữ (không xóa) để có thể tra lại; có thể dọn sau.

## Follow-Up

- ✅ Restore scripts, relocate design-spec, document mock-first, tạo E08.1.
- Cân nhắc xóa `.harness-backup/` sau khi commit ổn định (story riêng nếu cần).
