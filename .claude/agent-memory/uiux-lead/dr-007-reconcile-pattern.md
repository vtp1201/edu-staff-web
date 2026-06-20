---
name: dr-007-reconcile-pattern
description: DR-007 announcements reconcile — 6th confirmation of the design-spec-gap-only reconcile pattern for 1506 handoff screens
metadata:
  type: project
---

DR-007 (Announcements / US-E10.3) was a pure reconcile. design_src/edu/announcements.jsx
existed (1641 lines) from the 1506 handoff. US-E10.3 was status `implemented`. The
announcements i18n namespace had 80+ keys already in messages/{vi,en}.json.

The only gap: zero `screens.announcements` entry in docs/product/design-spec.jsonc.

Result: wrote full normative design-spec entry (~550 lines JSONC) covering:
- page layout, breadcrumb, title row, filter pills (all/sent/scheduled/draft)
- announcement card (3 priority variants, 3 status variants, urgent accent bar, draft notice, read-receipt strip, progress bar)
- empty/loading/error states
- create/edit drawer (480px): all fields (title, body, audience multi-select + grade/class narrowing + estimate strip, priority radiogroup, send-mode + schedule picker with calendar+time stepper, attachments, preview panel), footer actions
- detail side-sheet (620px): audience strip, body text, attachments, read-receipt ratio panel, filter tabs (all/read/unread), recipient list
- delete alertdialog
- toast variants (send/schedule/draft/delete/remind)
- role variants (admin vs principal with different primaryColor; recipientRoles note)
- lookups (priority/status/audiencePresets)
- API contract (noti service, mock-first, SSE fan-out)
- a11y notes (13 items)
- responsive breakpoints

i18n: 0 new keys added. All 80+ keys already existed.
US-E10.3: NOT stale (correct ID, confirmed implemented).

**Why:** 6th consecutive 1506 handoff screen where JSX + FE implementation existed but
design-spec.jsonc entry was missing. Pattern is consistent across all DR-002 through DR-007.

**How to apply:** For any DR targeting a 1506 handoff screen — grep design-spec.jsonc first.
If JSX exists + implementation exists + spec missing → pure reconcile; only deliverable is
the design-spec entry. No new i18n keys unless the spec reveals a genuinely uncovered state.

Related: [[dr-006-reconcile-pattern]], [[dr-005-reconcile-pattern]], [[pipeline-conventions]]
