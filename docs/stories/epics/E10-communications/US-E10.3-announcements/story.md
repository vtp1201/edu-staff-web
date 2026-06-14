# US-E10.3 Announcements (Admin / Principal Create & Manage)

## Status

planned

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
