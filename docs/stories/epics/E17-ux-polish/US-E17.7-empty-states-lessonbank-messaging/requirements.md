# Requirements — US-E17.7 Empty States — Lesson Bank + Messaging Conversations

## Summary

Two screens need canonical empty state treatment: the lesson-bank screen (already has a `LessonBankEmpty` component — audit whether it meets canonical pattern) and the messaging screen (the `EmptyMessagingState` component shown when no conversation is selected — audit and upgrade). Both use existing i18n keys. No new tokens, no new i18n keys, no BE changes.

## Actors & Roles

| Role | Screen | Notes |
|---|---|---|
| Teacher | `/teacher/lesson-bank` | Primary lesson-bank user |
| Principal | `/principal/lesson-bank` | Read-only access |
| Teacher | `/teacher/messaging` | Primary messaging user |
| Student | `/student/messaging` | Mobile-first |
| Parent | `/parent/messaging` | Mobile-first |

## Functional Requirements

**TR-001** — Lesson bank: all-lessons empty state (canonical pattern)
When no lessons exist (`allVariant`): the system SHALL render:
- Container: `role="status"`, centered column, padding 40px 20px
- Icon: `BookOpen` 64px, color `var(--edu-text-muted)`, `aria-hidden="true"`
- Title: i18n key `lessonBank.empty.title` ("Chưa có bài giảng"), 16px/700, `var(--edu-text-primary)`
- Body: i18n key `lessonBank.empty.body` ("Tải lên bài giảng đầu tiên để bắt đầu xây dựng kho."), 13px, `var(--edu-text-secondary)` (see TR-NFR-001), max-width 320px
- CTA: `lessonBank.empty.cta` ("Tải lên bài giảng"), variant=primary, min 44px touch target

**TR-002** — Lesson bank: filter/search empty state (canonical pattern)
When a search or filter returns no results (`filterVariant`): the system SHALL render:
- Container: `role="status"`, centered column, padding 40px 20px
- Icon: `Search` 64px, color `var(--edu-text-muted)`, `aria-hidden="true"`
- Title: i18n key `lessonBank.empty.noMatch` ("Không tìm thấy bài giảng"), 16px/700, `var(--edu-text-primary)`
- Body: i18n key `lessonBank.empty.noMatchBody` ("Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm."), 13px, `var(--edu-text-secondary)`, max-width 320px
- CTA: none (`hasCTA: false` for filter variant)

**TR-003** — Messaging conversations: no-selection / empty list state (canonical pattern)
When no conversation is active and the conversation list is empty, the system SHALL render:
- Container: `role="status"`, centered column, padding 40px 20px
- Icon: `MessageSquare` 64px, color `var(--edu-text-muted)`, `aria-hidden="true"`
- Title: i18n key `messaging.empty.title` ("Chọn một cuộc trò chuyện"), 16px/700, `var(--edu-text-primary)`
- Body: i18n key `messaging.empty.subtitle` ("Nhấn vào một cuộc trò chuyện để bắt đầu nhắn tin"), 13px, `var(--edu-text-secondary)`, max-width 320px
- CTA: i18n key `messaging.empty.cta` ("Bắt đầu cuộc hội thoại"), variant=primary, min 44px touch target

**TR-004** — Existing `LessonBankEmpty` and `EmptyMessagingState` components
Before implementing, FE team MUST audit current implementations:
- If current component already meets the canonical pattern (icon size, container role, touch target) — update only what diverges.
- If current component is structurally different — replace its internals.
- Do NOT create a duplicate component; upgrade the canonical home.

**TR-005** — Loading states unchanged
Loading skeletons in lesson-bank and messaging SHALL remain as-is.

## Non-Functional Requirements

**TR-NFR-001 — Accessibility (WCAG 2.1 AA) — contrast advisory**
Body text at `var(--edu-text-muted)` (3.08:1) FAILS 4.5:1 at 13px. FE team MUST use `var(--edu-text-secondary)` (5.1:1) for body. This applies to both lesson-bank and messaging body text.

**TR-NFR-002 — Touch target**
CTAs (lesson-bank upload + messaging start-conversation) MUST have min 44px height (WCAG 2.5.5). Applies on all viewport sizes.

**TR-NFR-003 — i18n**
No new keys. All keys confirmed in `vi.json`:
- `lessonBank.empty.title`, `lessonBank.empty.body`, `lessonBank.empty.cta`
- `lessonBank.empty.noMatch`, `lessonBank.empty.noMatchBody`
- `messaging.empty.title`, `messaging.empty.subtitle`, `messaging.empty.cta`

**TR-NFR-004 — No token additions**
No new `tokens.css` entries.

## Scope Boundary

**IN scope:**
- `src/features/lesson-bank/presentation/lesson-bank-screen/lesson-bank-empty.tsx` — audit + upgrade
- `src/features/messaging/presentation/messaging-screen/empty-messaging-state.tsx` — audit + upgrade

**OUT of scope:**
- Messaging mobile pane toggle (US-E17.3)
- Lesson-bank upload functionality (separate feature)
- Notification or grade-book empty states (separate stories)

## MoSCoW

| Priority | Requirement | Rationale |
|---|---|---|
| Must | TR-001, TR-002 | Both lesson-bank variants required; filter empty state without body fix shows broken state |
| Must | TR-003 | Messaging empty state is the primary entry point when user has no conversations |
| Must | TR-NFR-001 | Body contrast fix mandatory |
| Must | TR-NFR-002 | CTA touch target ≥44px; CTAs exist in this story |
| Should | TR-004 | Audit-first principle prevents duplicate component creation |
| Should | TR-NFR-003, TR-NFR-004 | Zero-drift on i18n + tokens |

## Design Spec Reference

`docs/product/design-spec.jsonc` keys:
- `emptyStatePattern` — canonical layout
- `emptyStates.lessonBank.list.allVariant` — book-open icon, CTA
- `emptyStates.lessonBank.list.filterVariant` — search icon, no CTA
- `emptyStates.messaging.conversations` — message-square icon, CTA
