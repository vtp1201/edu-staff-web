---
name: story-play-gap-pattern
description: List-screen stories (staffing, dashboard) have no play() functions — only static prop variants; recurring gaps are Loading/Error/ArchiveBlocked/CopyYear stories
metadata:
  type: feedback
---

When reviewing Storybook story `play()` functions for dashboard/list screens, the most common gaps are:

1. Default story covers visible data value + section title + CTA count, but misses:
   - Annotation text below stat cards (e.g. ADMIN_APPROVAL label)
   - Session key labels (Buổi sáng / Buổi chiều) for schedule items
   - All three status badge labels (Hoàn thành / Đang dạy / Sắp tới)
   - Live row CSS class assertion (`border-edu-success` on the `<li>`)

2. AllStats story lists stat labels but misses:
   - The trend `value` text (e.g. "so tuần trước") that proves AC-5
   - Annotation/sub-label text beneath specialty cards (AC-4)

3. Loading story checks null → "—" but misses asserting the rest of the dashboard still renders.

**Staffing UI (US-E12.9) pattern:** Stories cover Populated/Empty/CreateError/ReadOnlyNonAdmin per screen but are missing:
   - LoadingSkeleton story (AC-5 skeleton state) — no story exports this state in any of the 4 story files
   - NetworkError story (AC-6 error + retry) — no story with network-error prop variant
   - ArchiveBlocked named story (AC-4 tooltip state) — data exists in Populated fixture but not an explicit story
   - CopyYear open state story (AC-11) — no story opens CopyAssignmentsSheet

**Why:** Engineers write minimal prop-variant stories to prove the component mounts; static stories without play() cannot exercise interaction flows (open sheet, submit form, trigger confirm dialog).

**How to apply:** For every list screen, check these named stories exist: Populated, Empty, CreateError/ActionError, ReadOnlyNonAdmin, LoadingSkeleton, NetworkError. Flag missing Loading and Error as MAJOR (the repo's accepted proof shape allows static stories, but loading/error states are explicitly required by AC).
