# US-E12.12 Audit Log (Admin Read-Only, Append-Only, Cursor-Paginated)

## Status

in-progress

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

BE: REAL (US-064 BE comment suggests audit endpoints built).
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

- `docs/TEST_MATRIX.md`: add row US-E12.12 (planned, high-risk)
- `docs/product/screens.md`: add Admin "Audit Log" row -> design-ready
- [FLAG for ba-lead]: GDPR Nghi dinh 13/2023 compliance requirement — ADR candidate for audit log retention policy and immutability contract (decision >= 0023).
