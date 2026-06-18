---
name: us-e10.3-qa-patterns
description: Announcements screen (US-E10.3): gap patterns found in initial 7 stories; 12 additional stories added to reach 100% AC coverage
metadata:
  type: project
---

Initial 7 stories (Loading, EmptyState, ListWithAllStatuses, CreateDrawer_Validation,
CreateDrawer_Send, DetailSheet_ReadReceipts, DeleteDialog) covered AC-1, AC-2 (partial),
AC-4 (partial), AC-9 (partial), AC-11 (partial), AC-12 (partial) only.

**Gaps filled with 12 new stories:**
- AC-2: `CardFields_UrgentAndProgress` — asserts priority/status badges, progressbar role, urgent aria-label, recipientCount text
- AC-3: `FilterPills_SentTab` — clicks tab, asserts aria-selected flips; fetchListAction receives filter arg
- AC-4: `CreateDrawer_CharCount` — asserts "0/200" and "0/2000" char-count spans present before typing
- AC-5: `CreateDrawer_SendSubmit` — fills form, clicks Gửi ngay, asserts button leaves DOM (drawer closed)
- AC-6: `CreateDrawer_SaveDraft` — asserts Lưu nháp always enabled, clicks it, drawer closes
- AC-7: `CreateDrawer_ScheduleMode` — clicks Lên lịch radio, asserts datetime-local input appears + Lên lịch button
- AC-8: `CreateDrawer_PreviewToggle` — toggles Xem trước (aria-pressed false→true), asserts preview content
- AC-9: `DetailSheet_RecipientFilter` — opens sheet, clicks Chưa đọc tab, asserts read recipient gone, unread visible
- AC-10: `DetailSheet_Remind` — clicks Gửi nhắc chưa đọc, asserts button re-enables after async response
- AC-11: `DeleteDialog_Confirm` — clicks confirm Xóa, asserts dialog closes
- AC-12: `EmptyState_CTA` — asserts Tạo thông báo button present inside empty state
- AC-14: `A11y_DrawerAudienceGroupLabel` — asserts fieldset legend "Đối tượng", aria-pressed on audience chips, tablist has aria-label

**Why:** The original stories were snapshot-level (open dialog, find text). AC-3/5/6/7/8/10/11
all require interaction-to-completion (click, async, assert closure/state change).

**How to apply:** For any screen with multiple drawer/sheet/dialog flows, always add a
`_Confirm` or `_Submit` story that goes all the way to closure, not just to open state.
Char-count displays need their own story since they are always visible but easy to omit.
Filter tabs always need aria-selected assertions — clicking and checking is 2 lines.
