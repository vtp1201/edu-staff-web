# Epic E10 — Communications (Messaging, Notifications, Announcements)

## Summary

Toan bo luong truyen thong trong EduPortal: tin nhan truc tiep va nhom (E10.1),
trung tam thong bao voi SSE realtime (E10.2), va cong cu tao + quan ly thong bao
toan truong danh cho admin/hieu truong (E10.3). Tat ca roles deu co quyen truy
cap vao E10.1 va E10.2; chi admin/principal moi co quyen tao va quan ly
announcements (E10.3).

## Design Source

- `design_src/edu/messaging.jsx`    — 1506 handoff (E10.1)
- `design_src/edu/notifications.jsx` — 1506 handoff, DR-006 (E10.2)
- `design_src/edu/announcements.jsx` — 1506 handoff, DR-007 (E10.3)

## Scope

| US | Screen | Roles | BE Service | Design |
| --- | --- | --- | --- | --- |
| E10.1 | Messaging: 2-pane inbox + 1:1 + group chat (base) | all roles | social mock-first | `messaging.jsx` |
| E10.2 | Notifications Center: type taxonomy, SSE fan-out, mark-read | all roles | noti mock-first | `notifications.jsx` |
| E10.3 | Announcements: compose → preview → send pipeline, history | admin, principal | noti mock-first | `announcements.jsx` |
| E10.4 | Messaging Enhancements (DR-008): group lifecycle + message interactions | all roles | social mock-first | `messaging.jsx` (edustaff_5) |

## BE Dependencies (decision 0017)

- `social` service — messaging endpoints (conversations, messages, participants) — mock-first
- `noti` service — notification CRUD, mark-read, unread-count, SSE channel (`notification.new` event per decision 0009) — mock-first
- SSE proxy already wired in decision 0009; notification fan-out deferred until noti service ships

## Key Design Rules (from design files)

- Notification types: grade / attendance / discipline / announcement / system
- Announcements: audience presets = all / teachers-only / parents-only / students-only + grade-level + class
- Announcements priority: normal / important / urgent (color-coded)
- SSE simulation in design: 16s interval prepends incoming notification; toast appears 4.5s
- Messaging: Direct tab + Groups tab; online indicators; typing dots; system messages; date dividers
- Read receipts on announcements: per-recipient readAt tracking

## Notes

- E10.2 Notifications Center unread badge counter in global header is in-scope
- E10.3 fan-out to E10.2 Notifications Center (same SSE channel)
- Attachment support in announcements: up to 3 files (drag-and-drop placeholder in mock)
