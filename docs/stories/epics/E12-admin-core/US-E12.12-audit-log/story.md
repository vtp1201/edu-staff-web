# US-E12.12 Audit Log (Admin Read-Only, Append-Only, Cursor-Paginated)

## Status

implemented

## Lane

high-risk

## Dependencies

- Depends on: US-E14.4 (grade approval — generates audit events), US-E14.6 (academic record seal — generates audit events), US-E12.8 (admin route guard — protection)
- Blocks: none
- Feature module(s) cham: `src/features/audit-log/` (new feature)
- Shared contract/file: `bootstrap/endpoint/audit-log.endpoint.ts` (new)

## Product Contract

Admin xem lich su thay doi append-only cho tat ca cac hanh dong quan trong
(diem, hanh kiem, hoc ba, cai dat) theo Nghi dinh 13/2023 (GDPR equivalent VN).
Route: `/admin/audit-log`.

**Danh sach audit events (cursor-paginated, newest first):**
- Moi row: timestamp, actor (ten + role), action (GRADE_APPROVED, RECORD_SEALED, CONDUCT_OVERRIDE, SETTING_CHANGED...), entity type, entity ID/name, gia tri truoc, gia tri sau.
- Action badge mau: diem = success, hanh kiem = warning, hoc ba = primary, cai dat = info, xoa = error.

**Filter:**
- Entity type (diem / hanh kiem / hoc ba / cai dat).
- Action (tao / cap nhat / xoa / phe duyet / khoa / niêm phong / mo phong).
- Actor (tim theo ten nguoi thuc hien).
- Date range (tu ngay - den ngay).

**Cursor-based pagination:**
- "Tai them" button hien khi con du lieu; an khi het.
- Khong co "Trang" (append-only — khong xoa, khong sua).

**Export:** "Xuat CSV" button (placeholder cho phien ban nay — scope out).

**GDPR / Nghi dinh 13/2023 note:**
- Audit log append-only: khong co nut xoa / chinh sua bat ky row nao.
- Moi entry ghi ro: ai / lam gi / luc nao / thay doi gi.
- Retention: [ASSUMPTION] server-enforced 7 nam; UI khong can biet.

BE: mock-first (decision 0014) — US-064's "audit endpoints built" comment could
not be confirmed live anywhere in this repo (no `core` service is wired for
any sibling feature either); `AuditLogRepository` (REAL) is fully implemented
against the documented contract but DI selects `MockAuditLogRepository` while
`NEXT_PUBLIC_USE_MOCK=true`. Flip to REAL needs BE US-064 confirmation first —
no domain/presentation rework required when that happens (both repos satisfy
`IAuditLogRepository`).
RBAC: Chi admin (BGH). Tap ket qua khong loc theo tenant neu superadmin [ASSUMPTION].

## Relevant Product Docs

- `docs/product/screens.md` — Admin section (audit-log — new row)
- `design_src/edu/audit-log.jsx` — AuditLogScreen (1506)

## Acceptance Criteria

- AC-1 (loading): Skeleton rows khi load audit log.
- AC-2 (list success): Rows hien thi dung: timestamp, actor, action badge (mau theo loai), entity type, entity ID/name, gia tri truoc/sau.
- AC-3 (filter — entity type): Filter theo entity type -> chi hien events cua loai do.
- AC-4 (filter — action): Filter theo action -> chi hien events khop.
- AC-5 (filter — date range): Filter tu/den ngay -> chi hien events trong khoang thoi gian.
- AC-6 (filter — actor search): Nhap ten actor -> chi hien events cua actor do.
- AC-7 (cursor pagination): Click "Tai them" -> append them rows phia duoi (khong replace); nut bien mat khi het data.
- AC-8 (append-only): Khong co nut xoa / chinh sua tren bat ky row nao; UI xac nhan tinh chat append-only.
- AC-9 (empty state): Khong co event khop filter -> empty state "Khong tim thay ket qua".
- AC-10 (error state): API loi -> error banner co nut thu lai.
- AC-11 (RBAC): Chi admin; teacher/student/parent -> redirect.
- AC-12 (a11y): Table co caption + scope; pagination button co aria-label; filter inputs co label; WCAG AA.
- AC-13 (i18n): Tat ca strings qua namespace `auditLog`.

## Design Notes

- Route: `/admin/audit-log`
- Design file: `design_src/edu/audit-log.jsx` — AuditLogScreen, AuditLogTable, FilterBar, LoadMoreButton
- Commands: none (read-only, append-only)
- Queries: `getAuditLog` (filters + cursor pagination)
- API (REAL — US-064 BE suggested live):
  - `GET /core/api/v1/audit-log?entityType=&action=&actorId=&from=&to=&cursor=&limit=20`
  - Response: `{ data: AuditEvent[], meta: { nextCursor, hasMore } }` (standard envelope)
- Domain rules: Cursor-based (not offset). Page size = 20. No delete, no update operations exposed. Actor filter is display-name search (client-side on loaded page OR server-side — prefer server-side). GDPR Nghi dinh 13/2023: log is immutable from FE perspective.
- UI surfaces: AuditEventRow; ActionBadge (color-coded by entity type); FilterBar (entity type + action + actor + date range); LoadMoreButton; EmptyState

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | auditLogMapper (API event -> entity); filterAuditLog (entity type / action / date range validation) |
| Integration | AuditLogRepository REAL (GET with various filter combinations + cursor; error-code mapping) |
| E2E | Storybook: Loading / List_MixedActionTypes / Filter_EntityType / Filter_DateRange / LoadMore / EmptyState / ErrorState |
| Platform | bun build + tsc clean |
| Release | design-review gate pass; GDPR/compliance note documented |

## Harness Delta

- `docs/TEST_MATRIX.md`: US-E12.12 row -> implemented (unit/integration/e2e/platform all `yes`)
- `docs/product/screens.md`: Admin "Audit Log" row -> implemented (US-E12.12)
- [FLAG for ba-lead]: GDPR Nghi dinh 13/2023 compliance requirement — ADR candidate for audit log retention policy and immutability contract (decision >= 0023). Not resolved by this story (ComplianceNotice is a static banner referencing the decree, no retention logic in UI).
- [FOLLOW-UP, non-blocking]: confirm BE core US-064 status before flipping `NEXT_PUBLIC_USE_MOCK=false` for this feature's DI factory (`bootstrap/di/audit-log.di.ts`).
- [FOLLOW-UP, non-blocking]: `DateRangeFields` (feature-local `from<=to` validated date range) should be promoted to `components/shared/` the next time a 2nd screen needs the same pattern (component-architecture.md flag).
- [FOLLOW-UP, non-blocking, from fe-qa-playwright]: `Filter_EntityType`/`Filter_DateRange` Storybook stories currently seed pre-filtered fixture data rather than driving the Select/date inputs end-to-end; underlying filter logic is solidly unit/integration-tested, but a future pass could strengthen these to real interaction-driven proof.

## Evidence

Design review: pass
- design-system: conform (tokens-only confirmed by fe-tech-lead-reviewer grep + fe-accessibility-auditor color audit; zero raw colors/gray-scale/`text-destructive` misuse; `StatusBadge` reused for action/entity badges via `auditBadgeTone`, no new badge invented; shadcn `Table`/`Select`/`Input`/`Skeleton`/`Button` reused as-is)
- a11y: WCAG AA — fe-accessibility-auditor issued a clean PASS (0 blocking/critical/major/minor findings across 11 checked items: labels, aria-invalid/aria-describedby wired to real validation state, table accessible name via linked `aria-labelledby`, load-more button DOM removal + distinct aria-label, role="alert" on error banner, keyboard/focus preserved, motion-safe skeleton, heading hierarchy, zero contrast/token violations)
- impeccable audit (scoped, tokens-supreme per decision 0012): no AI-slop tells (no nested cards, no hero-metric grid, no gradient/glassmorphism); layout is a straightforward filter+table admin screen consistent with sibling screens (staff-leave, academic-records); touch targets consistently `min-h-11` (44px); table wrapped in `overflow-x-auto` for narrow viewports
- states: loading/empty/error/success + load-more-error (added during fix pass) all covered by Storybook interaction stories with `play()` assertions

fe-tech-lead-reviewer: Approved (after fix pass — 1 blocking defect found + fixed: load-more `fetchNextPage` failure was wiping already-loaded rows via `query.isError` collapsing all error states into one; fixed by isolating `firstPageError` from a separately-tracked `loadMoreError` state, per plan.md's State Architecture §6 spec). 2 non-blocking CONSIDER items addressed (AC-12 table caption linked via `aria-labelledby`; BE `retryable` signal threaded through `toFailure`/`isRetryableFailure` instead of hardcoded by failure type).

fe-qa-playwright: PASS — release-ready. 13/13 AC have real test proof; independently re-ran full suite (1143/1143), Storybook interaction tests for this feature (15/15), `tsc --noEmit`, `bun run build` — all green. Strengthened 2 Storybook assertions (LoadMore success-path row persistence; LogTable accessible-name proof) as test-only additions within QA's role.

Proof commands run (fe-lead, final verification): `bun vitest run` → 219 files / 1143 tests pass. `bun vitest:storybook run src/features/audit-log` → 5 files / 15 tests pass. `bunx tsc --noEmit` → clean. `bun run build` → clean, `/admin/audit-log` route emitted.
