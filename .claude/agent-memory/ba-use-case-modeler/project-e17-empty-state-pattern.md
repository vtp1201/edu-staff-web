---
name: project-e17-empty-state-pattern
description: E17 UX Polish — canonical emptyStatePattern applied across 4 stories (US-E17.4–E17.7). Body contrast advisory, role-CTA gating, audit-first rule for existing components.
metadata:
  type: project
---

## Canonical emptyStatePattern (from design-spec.jsonc)

Container: `role="status"`, centered flex column, `padding: 40px 20px`, `text-align: center`
Icon: 64px Lucide, `var(--edu-text-muted)`, `aria-hidden="true"`
Title: `<p>` (NOT h2/h3), 16px/700, `var(--edu-text-primary)`, `margin-top: 16px`
Body (if present): 13px, `var(--edu-text-secondary)` (MANDATORY — `text-muted` = 3.08:1 FAILS WCAG 1.4.3 at 13px), `max-width: 320px`
CTA (if present): `variant="primary"`, min 44px height (WCAG 2.5.5)

**Why:** DR-010 cross-cutting empty state polish; body contrast was the key a11y bug caught across multiple screens.

**How to apply:** Every time a UC involves body text on an empty state, always assert `var(--edu-text-secondary)` (not `text-muted-foreground`, not `var(--edu-text-muted)`). Include this in the AC explicitly.

## Story map

| Story | Screens | UCs | Body text? | CTA? |
|---|---|---|---|---|
| US-E17.4 | Discipline violations/conduct/leave (Teacher/Principal/Parent) | 5 | No | No |
| US-E17.5 | Grade book table (all 5 roles) + mobile scroll | 6 | No | No |
| US-E17.6 | Notifications center All/Unread tabs (all roles) | 5 | Yes — `text-secondary` | No |
| US-E17.7 | Lesson bank (allVariant+filterVariant) + Messaging | 7 | Yes — `text-secondary` | Yes (lesson upload + new conversation) |

## Icon assignments (confirmed)

- Violations: `Shield`
- Conduct: `ClipboardList` (open question — not in design-spec.jsonc explicitly)
- Leave requests: `CalendarOff`
- Grade book: `FileText`
- Notifications All: `BellOff`
- Notifications Unread: `CheckCircle`/`CheckCircle2`
- Lesson bank all: `BookOpen`
- Lesson bank filter: `Search`
- Messaging: `MessageSquare`

## Key business rules established

- Discipline violations: legacy `<Check text-edu-success>` MUST be removed — misleading (zero violations ≠ positive badge).
- Grade book i18n: namespace is `gradeBook` (NOT `grades`), key is `emptyState`.
- Grade book: `aria-live="polite"` added (beyond base pattern) — confirmed as additive a11y.
- Lesson bank: Principal sees allVariant empty state but CTA is hidden (read-only role cannot upload).
- Lesson bank: audit-first rule — upgrade existing `lesson-bank-empty.tsx` in place; no new component.
- Messaging: audit-first rule — upgrade existing `empty-messaging-state.tsx` in place.
- Parent discipline child-switcher: state machine resets to loading on child switch; do not retain previous child's empty state.

## Open questions to track (flagged for ba-lead)

- E17.4 OQ-01: Conduct tab icon confirmation (`ClipboardList` vs alternatives)
- E17.4 OQ-02: Parent child-switch transition — immediate reset vs optimistic retention
- E17.4 OQ-03: Principal leave-requests tab existence
- E17.5 OQ-01: `MobileScroll` story already exists from US-E17.2?
- E17.5 OQ-02: `aria-live="polite"` confirmed for grade book?
- E17.5 OQ-03: Parent grade book personalized title for child?
- E17.6 OQ-01: `CheckCircle` vs `CheckCircle2` icon pin
- E17.6 OQ-02: `role="status"` wrapper vs internal component in notifications-center
- E17.6 OQ-03: Future notification tabs (Mentions, System)?
- E17.7 OQ-01: Principal lesson-bank CTA hidden vs disabled
- E17.7 OQ-02: Messaging CTA trigger mechanism (prop callback vs route push)
- E17.7 OQ-03: filterVariant loading state during search debounce
- E17.7 OQ-04: `messaging.empty.subtitle` key naming — standardize to `body`?
