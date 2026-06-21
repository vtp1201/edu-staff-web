# Spec — US-E17.7 Empty States — Lesson Bank + Messaging Conversations

**Status:** Planned
**Lane:** normal
**Sources:** requirements.md · use-cases.md · design-spec.jsonc (`emptyStatePattern`, `emptyStates.lessonBank.*`, `emptyStates.messaging.conversations`)

---

## 1. Overview

Two already-implemented components deviate from the canonical empty state pattern defined in `docs/product/design-spec.jsonc`. This story upgrades them in-place. No new BE endpoints, no new tokens, no new i18n keys.

| Component file | Current defects | Scope |
|---|---|---|
| `src/features/lesson-bank/presentation/lesson-bank-screen/lesson-bank-empty.tsx` | Icon 32px (needs 64px); no `role="status"`; body uses `text-muted-foreground` (3.08:1 FAIL); no `Search` icon for filter variant; CTA `size="sm"` may miss 44px | Upgrade in-place |
| `src/features/messaging/presentation/messaging-screen/empty-messaging-state.tsx` | Icon 48px (needs 64px); icon color `text-border` (wrong); no `role="status"`; body uses `text-muted-foreground` (3.08:1 FAIL); raw `<button>` with hardcoded tokens instead of design-system `Button` | Upgrade in-place |

**Canonical empty state pattern** (from `design-spec.jsonc` `emptyStatePattern`):

```
Container:  role="status"  flex flex-col items-center text-center px-5 py-10
Icon:       Lucide, size-16 (64px), text-edu-text-muted, aria-hidden="true"
Title:      <p>  text-base font-bold text-foreground  mt-4
Body:       <p>  text-sm text-edu-text-secondary  mt-2 max-w-xs  (NOT text-muted-foreground)
CTA:        <Button variant="default" className="mt-5 min-h-[44px]">
```

---

## 2. Screens & Routes

| Screen | Route | Component file |
|---|---|---|
| Lesson Bank — Teacher | `/[locale]/(dashboard)/teacher/lesson-bank` | `lesson-bank-screen/lesson-bank-empty.tsx` |
| Lesson Bank — Principal | `/[locale]/(dashboard)/principal/lesson-bank` | `lesson-bank-screen/lesson-bank-empty.tsx` |
| Messaging — Teacher | `/[locale]/(dashboard)/teacher/messaging` | `messaging-screen/empty-messaging-state.tsx` |
| Messaging — Student | `/[locale]/(dashboard)/student/messaging` | `messaging-screen/empty-messaging-state.tsx` |
| Messaging — Parent | `/[locale]/(dashboard)/parent/messaging` | `messaging-screen/empty-messaging-state.tsx` |

---

## 3. Actors & RBAC

| Role | Lesson bank empty — allVariant | Lesson bank empty — filterVariant | Messaging empty |
|---|---|---|---|
| Teacher | Icon + title + body + CTA | Icon + title + body, no CTA | Icon + title + body + CTA |
| Principal | Icon + title + body, **CTA hidden** (`canUpload=false`) | Icon + title + body, no CTA | Not on messaging route |
| Student | No lesson bank route | No lesson bank route | Icon + title + body + CTA |
| Parent | No lesson bank route | No lesson bank route | Icon + title + body + CTA |

**RBAC note:** The `canUpload` prop already exists on `LessonBankEmpty`. No new RBAC logic is added. The parent screen passes `canUpload={role === 'teacher'}`. Principal receives `canUpload={false}` — CTA is simply not rendered (not disabled-with-tooltip). This is the resolved answer to OQ-01.

---

## 4. Functional Spec — Exact Changes Per File

### 4.1 `lesson-bank-empty.tsx`

**Current props (unchanged):**
```ts
type LessonBankEmptyProps = {
  canUpload: boolean;
  hasActiveFilter: boolean;
  onUpload?: () => void;
};
```

**Changes required:**

| # | Location | Current | Required |
|---|---|---|---|
| F1 | Container `<div>` | No `role`; `px-8 py-16`; dashed border | Add `role="status"`; change padding to `px-5 py-10`; remove dashed border wrapper (canonical pattern uses plain centered column, not a card border) |
| F2 | Icon — allVariant | `<span>` wrapper 64px box + `<BookOpen size-8>` (icon itself 32px) + `bg-muted` background | Remove `<span>` wrapper; render `<BookOpen className="size-16 text-edu-text-muted" aria-hidden="true" />` directly |
| F3 | Icon — filterVariant | Same `BookOpen size-8` regardless of `hasActiveFilter` | When `hasActiveFilter` is true, render `<Search className="size-16 text-edu-text-muted" aria-hidden="true" />` |
| F4 | Body `<p>` | `text-muted-foreground` | `text-edu-text-secondary` |
| F5 | Body `<p>` | `text-sm` only, no max-width | Add `max-w-xs` |
| F6 | CTA `<Button>` | `size="sm"` | Remove `size="sm"`; add `className="mt-5 min-h-[44px]"` |
| F7 | Import | `import { BookOpen, Upload }` | `import { BookOpen, Search, Upload }` |
| F8 | Title `<p>` | `mt-0` (inside `space-y-1` div) | Add `mt-4` to title; keep `mt-2` gap before body (collapse the `space-y-1` wrapper div into individual `mt-*`) |

**Resulting structure (pseudo-JSX, not implementation code):**
```
<div role="status" className="flex flex-col items-center text-center px-5 py-10">
  {hasActiveFilter
    ? <Search className="size-16 text-edu-text-muted" aria-hidden="true" />
    : <BookOpen className="size-16 text-edu-text-muted" aria-hidden="true" />
  }
  <p className="text-base font-bold text-foreground mt-4">
    {hasActiveFilter ? t("empty.noMatch") : t("empty.title")}
  </p>
  <p className="text-sm text-edu-text-secondary mt-2 max-w-xs">
    {hasActiveFilter ? t("empty.noMatchBody") : t("empty.body")}
  </p>
  {canUpload && !hasActiveFilter && onUpload && (
    <Button onClick={onUpload} className="mt-5 min-h-[44px]">
      <Upload className="mr-1.5 size-4" aria-hidden="true" />
      {t("empty.cta")}
    </Button>
  )}
</div>
```

### 4.2 `empty-messaging-state.tsx`

**Current props (unchanged):**
```ts
export interface EmptyMessagingStateProps {
  onStart?: () => void;
}
```

**CTA trigger:** `onStart` callback prop. Parent messaging-screen passes `() => setModalOpen(true)`. The component calls the callback — no router.push, no context import. Architecture is already correct; keep as-is. This is the resolved answer to OQ-02.

**Changes required:**

| # | Location | Current | Required |
|---|---|---|---|
| M1 | Container `<div>` | No `role`; `flex-1 gap-3 bg-muted/30 px-6` | Add `role="status"`; change to `px-5 py-10`; remove `bg-muted/30` and `flex-1` (canonical pattern) |
| M2 | Icon | `<MessageSquare size-12 text-border strokeWidth={1.2}>` | `<MessageSquare className="size-16 text-edu-text-muted" aria-hidden="true" />` — remove `strokeWidth` override |
| M3 | Body `<p>` | `text-muted-foreground` | `text-edu-text-secondary` |
| M4 | Body `<p>` | No max-width | Add `max-w-xs` |
| M5 | CTA | Raw `<button>` with hardcoded `bg-primary px-4 py-2.5 rounded-lg font-semibold text-primary-foreground` | Replace with `<Button variant="default" className="mt-5 min-h-[44px]">` from `@/components/ui/button` |
| M6 | Import | No `Button` import | Add `import { Button } from "@/components/ui/button"` |
| M7 | Title `<p>` order | `font-bold text-base text-foreground` | Keep semantics; add `mt-4` for canonical spacing |

**Resulting structure (pseudo-JSX, not implementation code):**
```
<div role="status" className="flex flex-col items-center text-center px-5 py-10">
  <MessageSquare className="size-16 text-edu-text-muted" aria-hidden="true" />
  <p className="text-base font-bold text-foreground mt-4">{t("title")}</p>
  <p className="text-sm text-edu-text-secondary mt-2 max-w-xs">{t("subtitle")}</p>
  {onStart && (
    <Button variant="default" onClick={onStart} className="mt-5 min-h-[44px]">
      {t("cta")}
    </Button>
  )}
</div>
```

---

## 5. Non-Functional Requirements

### NFR-1 — Accessibility: body text contrast (WCAG 1.4.3, Must)

The system SHALL use `text-edu-text-secondary` (5.1:1 on `--edu-bg-surface`) for all body `<p>` elements in both empty state components.

- **Current state:** `text-muted-foreground` maps to `var(--edu-text-muted)` — measured contrast 3.08:1 at 13px, which FAILS WCAG AA (requires 4.5:1 for normal text).
- **Required state:** `text-edu-text-secondary` — 5.1:1, PASSES WCAG AA.
- **QA verification:** Storybook story renders body text; browser DevTools Accessibility panel confirms contrast ratio ≥ 4.5:1 on both light and dark themes.

### NFR-2 — Touch target ≥44px (WCAG 2.5.5, Must)

The system SHALL render CTA buttons with computed height ≥ 44px on all viewport sizes (320px, 375px, 768px, 1280px).

- **Mechanism:** `min-h-[44px]` Tailwind class on the `Button` element.
- **QA verification:** Storybook story at 375px viewport; check computed `clientHeight` in interaction test; also covers desktop (1280px).

### NFR-3 — `role="status"` on container (WCAG 4.1.3)

The system SHALL set `role="status"` on the outermost container `<div>` of every empty state variant. This announces the empty state to screen readers without being intrusive (it is a live region with `aria-live="polite"` implied by the role).

- **QA verification:** `getByRole('status')` in Storybook interaction tests; must succeed for all variants.

### NFR-4 — Icon `aria-hidden="true"` (WCAG 1.1.1)

The system SHALL set `aria-hidden="true"` on all Lucide icons inside the empty states. Icons are decorative in this context; text already communicates the state.

- **QA verification:** DOM inspection confirms no `alt` text on SVG; `aria-hidden="true"` attribute present.

### NFR-5 — Responsive: no overflow at 320px

The system SHALL not overflow at 320px viewport width. `max-w-xs` (320px) on body text and full-width-allowed CTA prevent layout breakage.

- **QA verification:** Storybook viewport set to 320px; no horizontal scroll; CTA label not truncated.

### NFR-6 — No new tokens, no new i18n keys

The system SHALL NOT introduce any new `tokens.css` entries or `messages/{vi,en}.json` keys. All required keys are confirmed to exist.

- **QA verification:** `git diff src/app/tokens.css` = empty; `git diff src/bootstrap/i18n/messages/` shows no new keys.

### NFR-7 — i18n: translate at presentation layer only

Both components already use `useTranslations()`. This SHALL remain — no translation logic moves to parent screen or use-case layer.

---

## 6. Acceptance Criteria

Full AC list from use-cases.md — reproduced here as the authoritative implementation checklist.

### Lesson Bank — allVariant (UC-01)

**AC-01.1** Given the lesson bank fetch has completed with an empty list and no filter/search active, when the component renders, then the empty state container has `role="status"`.

**AC-01.2** Given the above, when the container element is inspected, then it has `padding: 40px 20px`, `text-align: center`, and is a centered flex column.

**AC-01.3** Given the allVariant empty state is rendered, when the DOM is inspected, then a `BookOpen` icon is present with `aria-hidden="true"`, 64px size, and color `var(--edu-text-muted)`.

**AC-01.4** Given the allVariant empty state is rendered, when the DOM is inspected, then a `<p>` contains the text from `lessonBank.empty.title`, `font-size: 16px`, `font-weight: 700`, color `var(--edu-text-primary)`.

**AC-01.5** Given the allVariant empty state is rendered, when the DOM is inspected, then no `<h2>` or `<h3>` is present inside the empty state container.

**AC-01.6** Given the allVariant empty state is rendered, when the DOM is inspected, then a `<p>` contains the text from `lessonBank.empty.body`.

**AC-01.7** Given the allVariant empty state is rendered, when the body `<p>` is inspected, then its color is `var(--edu-text-secondary)`. `var(--edu-text-muted)` MUST NOT be applied to body text.

**AC-01.8** Given the allVariant empty state is rendered, when the body `<p>` is inspected, then its computed `max-width` is 320px.

**AC-01.9** Given the allVariant empty state is rendered with `canUpload={true}`, when the DOM is inspected, then a `<button>` element contains the text from `lessonBank.empty.cta` with `variant="default"` styling applied.

**AC-01.10** Given the allVariant empty state is rendered with `canUpload={true}`, when the CTA button element is measured, then its computed height is at least 44px.

**AC-01.11** Given the lesson bank fetch is pending, when the component renders, then the loading skeleton is present and the `role="status"` container is not present.

**AC-01.12** Given the lesson bank fetch has failed, when the component renders, then the error state is present and the `role="status"` container is not present.

**AC-01.13** Given the lesson bank fetch returns one or more lessons, when the component renders, then the lesson list is shown and the `role="status"` container is not present.

**AC-01.14** Given the FE team has audited the existing `lesson-bank-empty.tsx`, when the implementation is complete, then no new separate component file has been created. The existing component is upgraded in-place.

### Lesson Bank — filterVariant (UC-02)

**AC-02.1** Given a search or filter is active and returns no matching lessons, when the component renders, then the empty state container has `role="status"`.

**AC-02.2** Given the filterVariant empty state is rendered, when the DOM is inspected, then a `Search` icon is present with `aria-hidden="true"`, 64px, color `var(--edu-text-muted)`.

**AC-02.3** Given the filterVariant empty state is rendered, when the DOM is inspected, then a `<p>` contains the text from `lessonBank.empty.noMatch`, 16px / 700, `var(--edu-text-primary)`.

**AC-02.4** Given the filterVariant empty state is rendered, when the DOM is inspected, then a `<p>` contains the text from `lessonBank.empty.noMatchBody`.

**AC-02.5** Given the filterVariant empty state is rendered, when the body `<p>` is inspected, then its color is `var(--edu-text-secondary)`. `var(--edu-text-muted)` MUST NOT be used.

**AC-02.6** Given the filterVariant empty state is rendered, when the DOM is inspected, then no `<button>` or `<a>` exists inside the empty state container.

**AC-02.7** Given the allVariant is shown (no lessons), when the user enters a search term, then the `BookOpen` icon is replaced by `Search`, the title changes to `lessonBank.empty.noMatch`, and the CTA disappears.

**AC-02.8** Given the filterVariant is shown, when the user clears the search/filter and the lesson list is still empty, then the `Search` icon is replaced by `BookOpen`, the title changes to `lessonBank.empty.title`, and the CTA reappears.

### Lesson Bank — CTA Touch Target (UC-03)

**AC-03.1** Given the allVariant empty state on a 1280px viewport, when the CTA button is measured, then its height is at least 44px.

**AC-03.2** Given the allVariant empty state on a 375px viewport, when the CTA button is measured, then its height is at least 44px.

### Messaging Empty State (UC-04)

**AC-04.1** Given no conversation is selected and/or the conversation list is empty, when the messaging screen renders, then the empty state container has `role="status"`.

**AC-04.2** Given the above, when the container is inspected, then it has `padding: 40px 20px`, `text-align: center`, and is a centered flex column.

**AC-04.3** Given the messaging empty state is rendered, when the DOM is inspected, then a `MessageSquare` icon is present with `aria-hidden="true"`, 64px, color `var(--edu-text-muted)`.

**AC-04.4** Given the messaging empty state is rendered, when the DOM is inspected, then a `<p>` contains the text from `messaging.empty.title`, 16px / 700, `var(--edu-text-primary)`.

**AC-04.5** Given the messaging empty state is rendered, when the DOM is inspected, then no `<h2>` or `<h3>` is present inside the empty state container.

**AC-04.6** Given the messaging empty state is rendered, when the DOM is inspected, then a `<p>` contains the text from `messaging.empty.subtitle`.

**AC-04.7** Given the messaging empty state is rendered, when the body `<p>` is inspected, then its color is `var(--edu-text-secondary)`. `var(--edu-text-muted)` MUST NOT be used.

**AC-04.8** Given the messaging empty state is rendered, when the body `<p>` is inspected, then its computed `max-width` is 320px.

**AC-04.9** Given the messaging empty state is rendered with `onStart` prop provided, when the DOM is inspected, then a `<button>` contains the text from `messaging.empty.cta` with `variant="default"` styling.

**AC-04.10** Given the messaging empty state is rendered with `onStart` prop provided, when the CTA button is measured, then its computed height is at least 44px.

**AC-04.11** Given the messaging fetch is pending, when the component renders, then the loading skeleton is present and the `role="status"` container is not present.

**AC-04.12** Given the messaging fetch has failed, when the component renders, then the existing error state is present and the `role="status"` container is not present.

**AC-04.13** Given the user selects a conversation, when the messaging screen updates, then the conversation view is shown and the `role="status"` container is not present.

**AC-04.14** Given the FE team has audited the existing `empty-messaging-state.tsx`, when the implementation is complete, then no new separate component file has been created. The existing component is upgraded in-place.

### Messaging — CTA Touch Target (UC-05)

**AC-05.1** Given the messaging empty state on a 375px viewport, when the CTA button is measured, then its height is at least 44px.

**AC-05.2** Given the messaging empty state on a 1280px viewport, when the CTA button is measured, then its height is at least 44px.

### Loading & Error States Unchanged (UC-06)

**AC-06.1** Given the lesson bank fetch is pending, when the component renders, then the existing skeleton is present and no `role="status"` empty state container is present.

**AC-06.2** Given the lesson bank fetch has failed, when the component renders, then the existing error state is present and no `role="status"` container is present.

**AC-06.3** Given the messaging fetch is pending, when the component renders, then the existing skeleton is present and no `role="status"` empty state container is present.

**AC-06.4** Given the messaging fetch has failed, when the component renders, then the existing error state is present and no `role="status"` container is present.

### Role Access (UC-07)

**AC-07.1** Given a Principal is authenticated and the lesson bank returns an empty list, when the allVariant empty state renders, then the `BookOpen` icon and `lessonBank.empty.title` are shown, but the CTA button is NOT rendered (`canUpload={false}`).

**AC-07.2** Given a Teacher is authenticated and the lesson bank returns an empty list, when the allVariant empty state renders, then the CTA button with `lessonBank.empty.cta` label is present.

**AC-07.3** Given a Student is authenticated and opens `/student/messaging` with no conversations, when the messaging empty state renders, then the `MessageSquare` icon, `messaging.empty.title`, body, and CTA are shown.

**AC-07.4** Given a Parent is authenticated and opens `/parent/messaging` with no conversations, when the messaging empty state renders, then the `MessageSquare` icon, `messaging.empty.title`, body, and CTA are shown.

---

## 7. Dependencies

- **Depends on:** none
- **Blocks:** none (US-E17.3 messaging pane toggle is independent)
- **Feature modules touched:**
  - `src/features/lesson-bank/presentation/lesson-bank-screen/`
  - `src/features/messaging/presentation/messaging-screen/`
- **Shared contracts:** none — both components are self-contained presentation components; no DTO, endpoint, or use-case changes

---

## 8. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
|---|---|---|---|---|
| TR-001 — Lesson bank allVariant canonical pattern | requirements.md TR-001 | UC-01, UC-03, UC-07 | None (mock-first; no BE call added) | Must |
| TR-002 — Lesson bank filterVariant canonical pattern (Search icon) | requirements.md TR-002 | UC-02, UC-07 | None | Must |
| TR-003 — Messaging empty state canonical pattern | requirements.md TR-003 | UC-04, UC-05, UC-07 | None | Must |
| TR-004 — Audit-first, no duplicate component | requirements.md TR-004 | UC-01 AC-01.14, UC-04 AC-04.14 | None | Should |
| TR-005 — Loading/error states unchanged | requirements.md TR-005 | UC-06 | None | Must |
| TR-NFR-001 — Body contrast `text-edu-text-secondary` | requirements.md TR-NFR-001 | UC-01 AC-01.7, UC-02 AC-02.5, UC-04 AC-04.7 | None | Must |
| TR-NFR-002 — CTA touch target ≥44px | requirements.md TR-NFR-002 | UC-03, UC-05 | None | Must |
| TR-NFR-003 — No new i18n keys | requirements.md TR-NFR-003 | All | None | Should |
| TR-NFR-004 — No new tokens | requirements.md TR-NFR-004 | All | None | Should |

### i18n Key Traceability

| i18n Key | Component | Variant |
|---|---|---|
| `lessonBank.empty.title` | `lesson-bank-empty.tsx` | allVariant title |
| `lessonBank.empty.body` | `lesson-bank-empty.tsx` | allVariant body |
| `lessonBank.empty.cta` | `lesson-bank-empty.tsx` | allVariant CTA (Teacher only) |
| `lessonBank.empty.noMatch` | `lesson-bank-empty.tsx` | filterVariant title |
| `lessonBank.empty.noMatchBody` | `lesson-bank-empty.tsx` | filterVariant body |
| `messaging.empty.title` | `empty-messaging-state.tsx` | title |
| `messaging.empty.subtitle` | `empty-messaging-state.tsx` | body |
| `messaging.empty.cta` | `empty-messaging-state.tsx` | CTA |

---

## 9. Open Questions

All four open questions from use-cases.md are **resolved** in this spec:

**OQ-01 (Principal lesson bank CTA) — RESOLVED:** CTA is hidden (not rendered, not disabled). The `canUpload` prop already controls this. The parent screen passes `canUpload={false}` for Principal. No new i18n key, no tooltip needed.

**OQ-02 (Messaging CTA trigger) — RESOLVED:** `onStart` callback prop. The parent messaging-screen passes `() => setModalOpen(true)`. The component fires the callback — no `router.push`, no context import. Architecture is correct; keep `onStart` prop unchanged.

**OQ-03 (filterVariant debounce during re-fetch) — RESOLVED:** Loading state (skeleton) replaces the empty state during any pending fetch, including filter re-fetches. AC-06 AC-01.11 and AC-04.11 cover this: `role="status"` container is not present while fetch is pending. The component does not manage fetch state itself; the parent passes the resolved props.

**OQ-04 (messaging.empty.subtitle key name) — RESOLVED, deferred:** The key `messaging.empty.subtitle` is confirmed in `vi.json`. Key rename to `messaging.empty.body` is a zero-value change for this story (both sides of the key exist, semantics are identical). Standardization is deferred to a future housekeeping story. Use `messaging.empty.subtitle` as-is.

---

## 10. Handoff to FE

### What `fe-lead` should build

Two file edits, zero new files:

1. **`src/features/lesson-bank/presentation/lesson-bank-screen/lesson-bank-empty.tsx`** — apply changes F1–F8 from §4.1. Import `Search` from lucide-react alongside existing `BookOpen` + `Upload`.

2. **`src/features/messaging/presentation/messaging-screen/empty-messaging-state.tsx`** — apply changes M1–M7 from §4.2. Replace raw `<button>` with design-system `Button`; import `Button` from `@/components/ui/button`.

### Suggested lane: normal

Two small component rewrites; no new routing, no new data fetching, no token changes.

### Storybook proof required

| Story file | Stories | Must assert |
|---|---|---|
| `lesson-bank-empty.stories.tsx` | `AllVariant` (canUpload=true), `FilterVariant` (hasActiveFilter=true), `WithUpload` (canUpload=true, interaction test) | Each: `getByRole('status')` succeeds; icon `aria-hidden="true"` present; body color class `text-edu-text-secondary`; CTA `clientHeight >= 44` |
| `empty-messaging-state.stories.tsx` | `Default` (no onStart), `WithCTA` (onStart provided, interaction test) | Each: `getByRole('status')` succeeds; icon `aria-hidden="true"` present; body class `text-edu-text-secondary`; CTA `clientHeight >= 44` |

### TEST_MATRIX rows owed

| Layer | Proof |
|---|---|
| Unit (Vitest) | Not applicable — no domain logic change |
| Story (Storybook interaction) | All 5 stories above pass their assertions |
| E2E | Not required for this polish story — Storybook interaction tests are sufficient |

### Design-review gate

Both components are in `features/*/presentation/` (single-screen use), so design-review gate applies via Storybook stories. Run `/impeccable audit` on the stories before closing the story.
