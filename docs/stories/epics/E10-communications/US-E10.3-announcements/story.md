# US-E10.3 Announcements (Admin / Principal Create & Manage)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E10.2 (notifications center — receives fan-out), US-E12.10 (class management — class list for audience picker)
- Blocks: none
- Feature module(s) cham: `src/features/announcements/` (new feature)
- Shared contract/file: `bootstrap/endpoint/announcements.endpoint.ts` (new); noti service endpoint

## Product Contract

Admin / hieu truong tao, xem truoc, gui, len lich, va quan ly thong bao toan truong
(`/admin/announcements`). Nguoi nhan thay thong bao qua Notifications Center (E10.2)
qua SSE fan-out.

**Danh sach thong bao:**
- Filter pills: Tat ca / Da gui / Da len lich / Nhap.
- Card moi: tieu de, badge uu tien (Thuong/Quan trong/Khan), badge trang thai, doi tuong gui, thoi gian, so nguoi nhan, ty le da doc (progress bar).
- Urgent announcement: left border do (4px).
- Action: xem chi tiet (da gui), sua nhap (nhap), xoa.

**Tao/Sua thong bao (Drawer — slide-in right 480px):**
- Tieu de (5-200 ky tu), noi dung (10-2000 ky tu) voi char count.
- Doi tuong (multi-select toggle chips): Tat ca / Chi giao vien / Chi phu huynh / Chi hoc sinh; loc them theo khoi lop (10/11/12) hoac lop cu the.
- Uoc tinh nguoi nhan (tinh theo preset chon).
- Uu tien: Thuong / Quan trong / Khan.
- Thoi gian gui: Gui ngay / Len lich (chon datetime-local).
- Dinh kem: toi da 3 file (drag-and-drop placeholder).
- Xem truoc: hien preview notification row (nhu nguoi nhan se thay trong DR-006).
- Footer: Huy | Luu nhap | Len lich / Gui ngay.

**Chi tiet thong bao da gui (SideSheet):**
- Thong tin gui, danh sach nguoi nhan voi trang thai da doc / chua doc.
- Nut "Gui lai nhac nhung chua doc".

RBAC: Chi ADMIN va principal (BGH). Teacher, student, parent -> redirect.
Mock-first: `noti` service chua ship.

## Relevant Product Docs

- `docs/product/screens.md` — Admin section (announcements — new row)
- `design_src/edu/announcements.jsx` — AnnouncementsScreen + CreateAnnouncementDrawer + AnnouncementDetailSheet (1506, DR-007)
- Epic overview: `docs/stories/epics/E10-communications/EPIC-OVERVIEW.md`

## Acceptance Criteria

- AC-1 (loading): Skeleton khi load danh sach thong bao.
- AC-2 (list): Card hien thi tieu de, badge uu tien (mau dung), badge trang thai, doi tuong, thoi gian, count nguoi nhan, progress bar da doc; urgent co left border do.
- AC-3 (filter): Pills filter (Tat ca/Da gui/Len lich/Nhap) loc chinh xac.
- AC-4 (create — validation): Tieu de < 5 ky tu hoac noi dung < 10 ky tu -> nut gui/luu disabled; char count hien thi.
- AC-5 (create — send): Dien du thong tin + "Gui ngay" -> thanh cong -> card moi xuat hien dau danh sach voi trang thai "Da gui"; toast xac nhan.
- AC-6 (create — draft): "Luu nhap" -> card xuat hien voi trang thai "Nhap"; co the sua lai.
- AC-7 (create — schedule): "Len lich" voi thoi gian hop le -> card trang thai "Da len lich".
- AC-8 (preview): Toggle "Xem truoc" -> preview notification row hien dung tieu de / noi dung / uu tien.
- AC-9 (detail sheet — read receipts): Click "Xem chi tiet" -> SideSheet hien danh sach nguoi nhan voi readAt; filter All/Da doc/Chua doc.
- AC-10 (remind): Click "Gui nhac" -> toast "Da gui nhac den N nguoi chua doc".
- AC-11 (delete): Click "Xoa" -> confirm dialog -> xac nhan -> card bien mat; toast.
- AC-12 (empty state): Chua co thong bao -> empty state co CTA "Tao thong bao".
- AC-13 (RBAC): Chi admin/principal; teacher/student/parent -> redirect.
- AC-14 (a11y): Drawer trap focus; audience picker co group label; WCAG AA; motion-safe slide-in.
- AC-15 (i18n): Tat ca strings qua namespace `announcements`.

## Design Notes

- Route: `/admin/announcements`
- Design file: `design_src/edu/announcements.jsx` — AnnouncementsScreen, StatusPills, AnnouncementCard, CreateAnnouncementDrawer, AnnouncementDetailSheet, DeleteDialog
- Commands: `createAnnouncement`, `updateDraftAnnouncement`, `deleteAnnouncement`, `sendReminder`
- Queries: `getAnnouncements` (filter by status), `getAnnouncementRecipients`
- API (mock-first — noti service planned):
  - `GET  /noti/api/v1/announcements?status=`
  - `POST /noti/api/v1/announcements`
  - `PUT  /noti/api/v1/announcements/:id`
  - `DELETE /noti/api/v1/announcements/:id`
  - `GET  /noti/api/v1/announcements/:id/recipients`
  - `POST /noti/api/v1/announcements/:id/remind`
- Audience estimate: Tat ca ~1280, teachers ~42, parents ~768, students ~480 (from design mock; real from BE).
- Fan-out: POST /send -> noti service publishes `notification.new` SSE events to all recipients.
- UI surfaces: AnnouncementCard (with priority left-border, progress bar); CreateAnnouncementDrawer (right 480px slide); AnnouncementDetailSheet; DeleteDialog

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | createAnnouncement (valid/title-too-short/no-audience/schedule-past-date); deleteAnnouncement (ok/not-found); audienceEstimate calculation |
| Integration | AnnouncementsRepository mock (CRUD, send, remind, recipients) |
| E2E | Storybook: Loading / ListWithAllStatuses / CreateDrawer_Validation / CreateDrawer_Send / DraftEdit / DetailSheet_ReadReceipts / EmptyState |
| Platform | bun build + tsc clean |
| Release | design-review gate pass |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E10.3 (planned)
- `docs/product/screens.md`: add Admin "Announcements" row -> design-ready

## Evidence

```text
Design review: PASS
Date: 2026-06-18
Reviewer: fe-lead (design-review gate)

1. design-system: CONFORM
   - Tokens only — no raw colors (#hex, slate-*, gray-*) found in any of the 5 presentation files.
   - All error text uses `text-edu-error-text` (#c0392b, 5.1:1 on white) and `bg-edu-error-dark` (#b91c1c) — both defined in tokens.css.
   - Active filter pills: `bg-primary/12 text-edu-text-primary` — correct per sidebar active pattern.
   - Audience/grade chips: `bg-primary/12 text-edu-text-primary` (active) / `bg-muted text-foreground` (inactive) — token-correct.
   - Card: `bg-card shadow-card hover:shadow-card-hover rounded-[var(--edu-radius-card)]` — spec-exact.
   - Urgent border: `border-l-4 border-edu-error` — intentional per spec (AC-2), paired with StatusBadge "urgent" text. NOT flagged.
   - Progress bar fill: `bg-edu-success-text` (AA-compliant #007a6e, 5.4:1) with `motion-reduce:transition-none` guard.
   - Typography: page-title `text-2xl font-extrabold`, card body `text-sm`, label `text-xs font-medium/bold`, char-count `text-xs text-edu-text-secondary` — all within design scale.
   - Spacing: card padding p-5 (20px), screen padding p-4/sm:p-6, gap-4/gap-6 — compliant with 20–24px card / 16px gap spec.
   - Radius: cards `var(--edu-radius-card)` = 12px; btns/chips `rounded-full` or `var(--edu-radius-btn)` = 8px — correct.
   - StatusBadge reused from `src/components/shared/status-badge/` for all priority + status badges and recipient read status. No inline badge reinvention.
   - No StatCard/ProgressBar primitive reinvented — progress bar rendered inline per design (not a standalone shared component), consistent with existing attendance pattern.

2. a11y: WCAG AA OK
   - A11Y-017 through A11Y-030 all verified present in committed code:
     • `text-edu-error-text` for all form error messages (contrast 5.1:1).
     • `text-edu-error-dark` / `text-edu-error-foreground` on delete dialog action button (8.2:1 / white on dark red).
     • `bg-edu-success-text` progress bar fill (5.4:1 on white background, visible as fill color).
     • `role="progressbar"` + `aria-valuenow/min/max` + `aria-label` on read-receipt bar.
     • `aria-label` on urgent article cards via `t("urgentCardAriaLabel", { title })`.
     • All form fields: `aria-invalid` + `aria-describedby` pointing to error paragraph ids.
     • Sheet `closeLabel={t("btnClose")}` — i18n close button label on both drawers.
     • Skeleton loading: `<output aria-label={t("loadingAriaLabel")}>` on list skeleton; `role="status" aria-busy="true"` on recipients skeleton.
   - Radix Sheet (focus trap + Esc) and AlertDialog (focus trap) semantics preserved — no ARIA overrides.
   - Icon-only buttons: `aria-label` on Eye / Pencil / Trash2 ghost buttons.
   - Audience picker and grade filter use `<fieldset>/<legend>` — proper group labeling.
   - Motion: progress bar `motion-reduce:transition-none`; Radix Sheet slide-in inherits `prefers-reduced-motion` from Radix defaults.
   - Keyboard: all interactive elements are native `<button>`, `<input>`, `<label>` — fully keyboard-operable.

3. impeccable audit: 0 findings after a11y fixes
   - Scanned for anti-patterns per .claude/rules/impeccable.md:
     • No raw colors.
     • No `style={{ }}` inline except dynamic `width: ${readPct}%` on progress bar fill — correct exception (computed value).
     • No `clsx` misuse — `cn()` from `@/shared/utils` used throughout.
     • No `outline: none` without replacement focus style.
     • Typography hierarchy is clear: h1 page-title → h2 empty-state → h3 card-title → body sm → caption xs.
     • Empty state has icon + heading + body + CTA button — full pattern, not a bare string.
     • Error state uses semantic token color with descriptive text.
     • Urgent left-border `border-l-4 border-edu-error` is INTENTIONAL per design spec (AC-2 + Design Notes). Paired with StatusBadge "urgent" text label — status not conveyed by color alone. NOT a finding.
     • No duplicate component patterns — StatusBadge consumed from shared/, no inline badge reinvention.
   - No polish applied that would conflict with design system.

4. states: ALL PRESENT
   - Loading: skeleton grid (4 cards) with `<output aria-label>` — list; skeleton rows with `aria-busy` — recipients.
   - Empty: icon box + heading + body + CTA button.
   - Error: card with `text-edu-error` error message.
   - Success / list: grid of AnnouncementCards (1/2/3 col responsive).
   - Drawer: validation state (disabled submit + inline errors), draft state (Luu nhap), send state (Gui ngay), schedule state (Len lich + datetime input), preview state (toggle preview row).
   - Detail sheet: recipient filter tabs (all/read/unread), loading skeletons, empty state, reminder button.
   - Delete dialog: confirm + cancel, isDeleting disabled state.

5. responsive: OK
   - List grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` — adapts cleanly.
   - Announcement drawer: `sm:max-w-[480px]` (per spec — 480px slide-in), full-width on mobile.
   - Detail sheet: `sm:max-w-[400px]` — 400px slide-in per spec, full-width on mobile.
   - Filter pills: `flex flex-wrap gap-2` — wraps at 320px.
   - Audience/grade chips + priority radio labels: `flex flex-wrap` — wraps without overflow.
   - Screen outer padding: `p-4 sm:p-6` — tighter on small screens.
```
