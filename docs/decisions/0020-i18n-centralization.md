# 0020 i18n Centralization — typed messages + translate at presentation

Date: 2026-06-06

## Status

Accepted

## Context

`auth` đi lệch convention: `FAILURE_MESSAGES` dịch trong Server Action, và
`login-form.tsx`/`page.tsx` còn hardcode tiếng Việt. Người dùng muốn **tất cả
chuỗi có i18n** và một cơ chế tập trung "dễ trace bug". Convention sẵn có
(`attendance`) đã dịch ở presentation bằng next-intl (v4.6).

## Decision

1. **Single source + type-safe** thay cho "1 const chứa chuỗi" (const literal sẽ
   mất i18n + drift). `vi.json` là nguồn key duy nhất; augment
   `AppConfig.Messages = typeof vi.json` ở `src/bootstrap/i18n/messages.d.ts` →
   `t("key")` check compile-time (key sai = fail build).
2. **Dịch ở presentation**: Server Action/use-case/repo trả **key ổn định**
   (`Failure["type"]`), presentation dịch (`useTranslations`/`getTranslations`).
   `loginAction` đổi `{ error: string }` → `{ errorKey: AuthFailure["type"] }`.
3. **Audit toàn repo**: migrate auth (actions/form/page) + dọn hardcoded còn sót
   ở `attendance` (roster headers, "Tiết"). Mock/seed data + brand noun KHÔNG
   đưa vào messages.
4. Thêm rule `.claude/rules/i18n.md`.

## Alternatives Considered

1. Const catalog TS (`I18N_KEYS`) mirror JSON — bỏ: trùng lặp, phải sync tay,
   drift khỏi JSON; typed augmentation đã đủ traceability.
2. Dịch trong action (giữ `FAILURE_MESSAGES` nhưng đọc messages) — bỏ: nhét i18n
   vào `'use server'`, lệch convention, chuỗi opaque khó style/trace.

## Consequences

Positive:

- 1 nguồn (`vi.json`) + check compile-time; typo key = lỗi build.
- Failure union = catalog lỗi, contract action↔presentation rõ ràng.
- Augmentation đã bắt sẵn 1 bug tồn đọng: `NavItem.labelKey` từng là `string`
  → giờ là `keyof shell.nav`.

Tradeoffs:

- `en.json` phải mirror `vi.json` thủ công (chưa có lint tự động so khớp 2 file).
- Raw color trong `login-form.tsx`/`page.tsx` vẫn còn (ngoài scope i18n) — flag
  follow-up design-system.

## Follow-Up

- (Optional) script CI so khớp key `vi.json` ↔ `en.json`.
- Story design-system: thay raw color trong `auth` presentation bằng token.
- Audit định kỳ hardcoded khi thêm feature mới.
