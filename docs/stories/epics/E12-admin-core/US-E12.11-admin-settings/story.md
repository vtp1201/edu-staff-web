# US-E12.11 Admin Settings (Tenant GradePublishMode Toggle)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E12.1 (school setup — settings infrastructure), US-E06.5 (core school-config wiring — REAL endpoint)
- Blocks: US-E14.2 (grade entry reads gradePublishMode), US-E14.4 (grade approval only appears when ADMIN_APPROVAL)
- Feature module(s) cham: `src/features/admin-settings/` (new feature) or extend `src/features/admin-school-setup/`
- Shared contract/file: `bootstrap/endpoint/admin-settings.endpoint.ts` (new); shared with E12.1 if settings endpoint is same

## Product Contract

Admin thay doi cai dat van hanh cua truong (`/admin/settings`). Hien tai chi co
1 setting chinh: `gradePublishMode` toggle.

**gradePublishMode toggle:**
- Gia tri: `SELF_PUBLISH` (mac dinh) | `ADMIN_APPROVAL`.
- SELF_PUBLISH: giao vien save diem -> tu dong published; hoc sinh/phu huynh thay ngay.
- ADMIN_APPROVAL: giao vien save diem -> PENDING_APPROVAL; admin can phe duyet truoc khi cong bo (E14.4).
- Toggle UI: radio buttons hoac toggle switch voi mo ta ro rang moi che do.
- Warning khi doi tu ADMIN_APPROVAL -> SELF_PUBLISH: "Cac lo diem dang cho duyet se duoc tu dong cong bo". Confirm truoc khi luu.
- Sau khi luu: toast "Da cap nhat cai dat"; gia tri moi co hieu luc ngay.

**Links to other admin screens:**
- "Lich hoc" -> `/admin/calendar`
- "Thang diem & Khung danh gia" -> `/admin/assessment` (E14.1)
- (Cac link nay la in-scope cho man hinh nay; cac man hinh dich da exist)

**BE integration: REAL (US-059 live)**
- `GET  /core/api/v1/config/school/operational-settings` — doc gia tri hien tai
- `PUT  /core/api/v1/config/school/operational-settings` — cap nhat

RBAC: Chi admin. Principal xem duoc nhung khong doi duoc (read-only) [ASSUMPTION].
BE: REAL endpoint (US-059 da live theo comment trong grade-entry.jsx).

## Relevant Product Docs

- `docs/product/screens.md` — Admin section (settings — new row)
- `design_src/edu/admin-settings.jsx` — AdminSettingsScreen (1506)
- US-E14.2 (reads gradePublishMode), US-E14.4 (approval flow — ADMIN_APPROVAL mode)

## Acceptance Criteria

- AC-1 (loading): Skeleton khi load cai dat hien tai.
- AC-2 (display current mode): gradePublishMode hien thi dung gia tri tu server (SELF_PUBLISH hoac ADMIN_APPROVAL) voi radio/toggle o dung vi tri.
- AC-3 (switch to ADMIN_APPROVAL): Chon ADMIN_APPROVAL -> nut Luu active; click Luu -> toast "Da cap nhat"; grade entry flow sau do yeu cau admin phe duyet.
- AC-4 (switch from ADMIN_APPROVAL to SELF_PUBLISH): Warning dialog "Cac lo diem cho duyet se duoc tu dong cong bo" -> Xac nhan -> luu thanh cong.
- AC-5 (navigation links): Click "Lich hoc" -> navigate /admin/calendar; "Thang diem" -> /admin/assessment; cac link mo dung man hinh.
- AC-6 (error state): Save that bai (network) -> error toast "Luu khong thanh cong, vui long thu lai"; gia tri khong thay doi.
- AC-7 (RBAC): Chi admin co the luu; principal (neu vao duoc) thay UI nhung nut Luu disabled hoac redirect.
- AC-8 (a11y): Radio buttons co fieldset + legend; toggle co aria-label; WCAG AA.
- AC-9 (i18n): Tat ca strings qua namespace `adminSettings`.

## Design Notes

- Route: `/admin/settings`
- Design file: `design_src/edu/admin-settings.jsx` — AdminSettingsScreen
- Commands: `updateOperationalSettings`
- Queries: `getOperationalSettings`
- API (REAL — US-059 live):
  - `GET  /core/api/v1/config/school/operational-settings`
  - `PUT  /core/api/v1/config/school/operational-settings`
  - Response: `{ gradePublishMode: "SELF_PUBLISH" | "ADMIN_APPROVAL" }`
- Domain rules: gradePublishMode change is tenant-wide; immediate effect. Switching from ADMIN_APPROVAL to SELF_PUBLISH auto-publishes pending batches (BE-enforced). Navigation links are static (no API).
- UI surfaces: GradePublishModeToggle; SettingsLinks; SwitchConfirmDialog

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | updateOperationalSettings use-case (ok/invalid-mode/network-error) |
| Integration | AdminSettingsRepository REAL (GET + PUT /config/school/operational-settings — error-code mapping) |
| E2E | Storybook: Loading / SELF_PUBLISH_Active / ADMIN_APPROVAL_Active / SwitchToSelfPublish_Warning / SaveSuccess / SaveError |
| Platform | bun build + tsc clean |
| Release | design-review gate pass |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E12.11 (planned)
- `docs/product/screens.md`: add Admin "Settings" row -> design-ready
