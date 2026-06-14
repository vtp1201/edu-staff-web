---
name: story-play-gap-pattern
description: Dashboard stories commonly miss AC-annotation text, trend label, and session key assertions in Default/AllStats stories
metadata:
  type: feedback
---

When reviewing Storybook story `play()` functions for dashboard screens, the most common gaps are:

1. Default story covers visible data value + section title + CTA count, but misses:
   - Annotation text below stat cards (e.g. ADMIN_APPROVAL label)
   - Session key labels (Buổi sáng / Buổi chiều) for schedule items
   - All three status badge labels (Hoàn thành / Đang dạy / Sắp tới)
   - Live row CSS class assertion (`border-edu-success` on the `<li>`)

2. AllStats story lists stat labels but misses:
   - The trend `value` text (e.g. "so tuần trước") that proves AC-5
   - Annotation/sub-label text beneath specialty cards (AC-4)

3. Loading story checks null → "—" but misses asserting the rest of the dashboard still renders.

**Why:** Engineers write minimal play assertions to prove the component mounts; QA's job is to extend them to cover every AC.

**How to apply:** For every dashboard story, diff each AC against the play assertions. Add assertions for: annotation sub-text, trend label text, session key text, CSS class for accent borders, badge count string, avatar initials, aria-label on CTAs.
