# Use Cases — US-E17.7 Empty States — Lesson Bank + Messaging

## 1. Use Case Scope Summary

**Total UCs:** 7
**Actors:** Teacher, Principal (lesson bank); Teacher, Student, Parent (messaging)
**Boundaries:** `lesson-bank-empty.tsx` (two variants: all lessons / filter no-match) and `empty-messaging-state.tsx`. Both files are audit-first: FE team checks the current implementation before modifying. Body text contrast fix is mandatory (`var(--edu-text-secondary)`, 5.1:1). Both lesson-bank CTA and messaging CTA must meet 44px minimum touch target. No new tokens, i18n keys, or BE changes.

---

## 2. Actor Catalogue

| Actor / Role | Type | Primary Device | Lesson Bank | Messaging |
|---|---|---|---|---|
| Teacher | Staff | Desktop | Primary user — can upload and view | Primary messaging user |
| Principal | Staff | Desktop | Read-only access | — |
| Student | Student | Mobile-first | — | Mobile messaging |
| Parent | Guardian | Mobile-first | — | Mobile messaging |

---

## 3. Use Case Catalogue

### UC-01: Lesson Bank "No Lessons" Empty State (allVariant)

**Goal:** Display the canonical empty state with a CTA when no lessons exist in the lesson bank.
**Primary Actor:** Teacher
**Secondary Actors:** Principal (read-only, no CTA needed — see AC-01.13)
**Preconditions:**
- User is authenticated as Teacher or Principal.
- The lesson bank screen is active.
- The lesson bank data fetch has completed successfully.
- No lessons exist (`allVariant` — the lesson list is empty and no search/filter is applied).
- Component is not in loading state and not in error state.

**Main Success Scenario:**
1. Lesson bank fetch completes; the list is empty; no filter/search is active.
2. System renders a container with `role="status"`, centered column layout, `padding: 40px 20px`.
3. System renders a `BookOpen` Lucide icon at 64px, color `var(--edu-text-muted)`, `aria-hidden="true"`.
4. System renders a `<p>` with i18n key `lessonBank.empty.title` ("Chưa có bài giảng"), 16px / font-weight 700, color `var(--edu-text-primary)`, `margin-top: 16px`.
5. System renders a body `<p>` with i18n key `lessonBank.empty.body` ("Tải lên bài giảng đầu tiên để bắt đầu xây dựng kho."), 13px, color `var(--edu-text-secondary)`, `max-width: 320px`.
6. System renders a CTA button with label from i18n key `lessonBank.empty.cta` ("Tải lên bài giảng"), `variant="primary"`, minimum height 44px.
7. Clicking the CTA triggers the lesson upload action/flow.

**Alternative Flows:**
- A1 — Lessons exist: the lesson list renders; this empty state is not shown.
- A2 — A search or filter is applied and returns no results: `filterVariant` (UC-02) renders instead.

**Exception Flows:**
- E1 — Fetch fails: existing error state renders; empty state is not shown.
- E2 — Fetch is pending: existing loading skeleton renders; empty state is not shown.

**Business Rules:**
- BR-01: `allVariant` condition: lesson list is empty AND no search/filter is active.
- BR-02: Body text MUST use `var(--edu-text-secondary)` — `var(--edu-text-muted)` fails WCAG 1.4.3 at 13px.
- BR-03: CTA minimum touch target is 44px height (WCAG 2.5.5).
- BR-04: Title is `<p>`, not a heading element.

**Non-functional Constraints:**
- WCAG 2.1 AA: `role="status"`, icon `aria-hidden="true"`, title 9.4:1 (PASS), body 5.1:1 with `text-secondary` (PASS), CTA touch target 44px.
- Responsive: no overflow at 320px; CTA maintains 44px height.

---

### UC-02: Lesson Bank "No Search/Filter Match" Empty State (filterVariant)

**Goal:** Display the canonical empty state (without a CTA) when a search or filter returns no matching lessons.
**Primary Actor:** Teacher
**Secondary Actors:** Principal (read-only)
**Preconditions:**
- User is authenticated as Teacher or Principal.
- The lesson bank screen is active.
- A search term or filter is active.
- The filtered/searched lesson list is empty.
- Lessons may exist (total count > 0) but none match the current search/filter.
- Component is not in loading state and not in error state.

**Main Success Scenario:**
1. User applies a search term or filter; fetch completes with zero matching results.
2. System renders a container with `role="status"`, centered column layout, `padding: 40px 20px`.
3. System renders a `Search` Lucide icon at 64px, color `var(--edu-text-muted)`, `aria-hidden="true"`.
4. System renders a `<p>` with i18n key `lessonBank.empty.noMatch` ("Không tìm thấy bài giảng"), 16px / 700, color `var(--edu-text-primary)`.
5. System renders a body `<p>` with i18n key `lessonBank.empty.noMatchBody` ("Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm."), 13px, color `var(--edu-text-secondary)`, `max-width: 320px`.
6. No CTA is rendered (`hasCTA: false` for filter variant).

**Alternative Flows:**
- A1 — User clears the search/filter and no lessons exist: `allVariant` (UC-01) renders.
- A2 — User clears the search/filter and lessons exist: lesson list renders.
- A3 — User updates the search/filter term: loading state renders; then the result (filtered list or filter empty state) replaces the current state.

**Exception Flows:**
- E1 — Fetch fails: existing error state renders.
- E2 — Fetch is pending: loading skeleton renders.

**Business Rules:**
- BR-01: `filterVariant` condition: a search/filter is active AND the filtered result is empty.
- BR-02: No CTA on filter variant — the guidance is to adjust the filter, not to upload.
- BR-03: Body text MUST use `var(--edu-text-secondary)`.
- BR-04: Title is `<p>`.

---

### UC-03: Lesson Bank CTA Touch Target

**Goal:** Confirm the lesson bank upload CTA meets the 44px minimum touch target on all viewport sizes.
**Primary Actor:** Teacher (initiates upload via CTA)
**Preconditions:** The `allVariant` empty state is rendered (UC-01 main success).

**Main Success Scenario:**
1. `allVariant` empty state renders with the CTA button.
2. The CTA button has a computed height of at least 44px.
3. The CTA button has a minimum width sufficient to contain the label text without truncation.
4. On touch devices at 375px viewport, the CTA is tappable without requiring precision targeting.

**Alternative Flows:** none.
**Exception Flows:** none.

**Business Rules:**
- BR-01: `min-height: 44px` on the CTA button element (WCAG 2.5.5).
- BR-02: CTA uses `variant="primary"` from the design system button component.

---

### UC-04: Messaging "No Conversation Selected / Empty List" Empty State

**Goal:** Display the canonical empty state in the messaging panel when no conversation is selected and/or the conversation list is empty, with a CTA to start a new conversation.
**Primary Actor:** Teacher, Student, Parent
**Secondary Actors:** none
**Preconditions:**
- User is authenticated as Teacher, Student, or Parent.
- The messaging screen is active.
- No conversation is currently selected, OR the conversation list is empty.
- Component is not in loading state and not in error state.

**Main Success Scenario:**
1. User opens the messaging screen; no conversation is selected or the list is empty.
2. System renders a container with `role="status"`, centered column layout, `padding: 40px 20px`.
3. System renders a `MessageSquare` Lucide icon at 64px, color `var(--edu-text-muted)`, `aria-hidden="true"`.
4. System renders a `<p>` with i18n key `messaging.empty.title` ("Chọn một cuộc trò chuyện"), 16px / 700, color `var(--edu-text-primary)`, `margin-top: 16px`.
5. System renders a body `<p>` with i18n key `messaging.empty.subtitle` ("Nhấn vào một cuộc trò chuyện để bắt đầu nhắn tin"), 13px, color `var(--edu-text-secondary)`, `max-width: 320px`.
6. System renders a CTA button with label from i18n key `messaging.empty.cta` ("Bắt đầu cuộc hội thoại"), `variant="primary"`, minimum height 44px.
7. Clicking the CTA opens the new conversation modal/flow.

**Alternative Flows:**
- A1 — User selects an existing conversation: the conversation view renders; empty state is hidden.
- A2 — User starts a new conversation via CTA: new conversation modal/flow opens (the modal behavior is out of scope for this story; the CTA trigger is in scope).

**Exception Flows:**
- E1 — Fetch fails: existing error state renders; empty state is not shown.
- E2 — Fetch is pending: existing loading skeleton renders; empty state is not shown.

**Business Rules:**
- BR-01: Body text MUST use `var(--edu-text-secondary)`.
- BR-02: CTA minimum touch target 44px height.
- BR-03: Title is `<p>`.
- BR-04: The CTA trigger action is scoped to opening the new-conversation modal; the modal implementation is a separate concern.

**Non-functional Constraints:**
- Mobile-first: Student and Parent are primary mobile users; 44px touch target and no overflow at 320px.

---

### UC-05: Messaging CTA Touch Target

**Goal:** Confirm the messaging "Bắt đầu cuộc hội thoại" CTA meets the 44px minimum touch target on all viewport sizes.
**Primary Actor:** Teacher, Student, Parent
**Preconditions:** The messaging empty state is rendered (UC-04 main success).

**Main Success Scenario:**
1. Messaging empty state renders with the CTA.
2. CTA button has computed height of at least 44px.
3. On 375px viewport (mobile), the CTA is tappable without precision targeting.

**Business Rules:**
- BR-01: `min-height: 44px` (WCAG 2.5.5).
- BR-02: CTA uses `variant="primary"`.

---

### UC-06: Loading and Error States (Unchanged)

**Goal:** Confirm that loading skeletons and error states in both lesson bank and messaging are unaffected by the empty state upgrade.
**Primary Actor:** Any authenticated role with access to each screen.
**Preconditions:** Data fetch is pending (loading) or has failed (error).

**Main Success Scenario — Loading:**
1. Fetch is pending.
2. Existing loading skeleton renders.
3. Neither the canonical empty state container nor the content list is present.

**Main Success Scenario — Error:**
1. Fetch fails.
2. Existing error state renders.
3. Neither the canonical empty state container nor the skeleton is present.

**Business Rules:** BR-01: These states are explicitly unchanged; any regression is a defect.

---

### UC-07: Role Access — Lesson Bank and Messaging

**Goal:** Confirm that the empty states are shown to the correct roles, and that no role sees an empty state for a screen they do not have access to.
**Primary Actor:** Teacher, Principal, Student, Parent
**Preconditions:** User is authenticated.

**Main Success Scenario:**

Lesson bank:
1. Teacher accesses `/teacher/lesson-bank` — `allVariant` or `filterVariant` empty state may render.
2. Principal accesses `/principal/lesson-bank` — read-only; `allVariant` may render (no CTA shown to Principal — see AC-07.1).
3. Student and Parent do not have lesson bank routes; they are not shown this screen.

Messaging:
1. Teacher, Student, Parent access their respective messaging routes — messaging empty state may render.
2. Principal does not have a messaging route in the current spec; not shown this screen.

**Business Rules:**
- BR-01: Lesson bank CTA ("Tải lên bài giảng") is an upload action — only Teachers should be able to trigger it. If Principal lands on an empty lesson bank, the empty state renders but the CTA is either hidden or disabled for the Principal role.
- BR-02: Role-gating of the CTA is determined by the role check already in the lesson bank screen; this story does not add new RBAC logic.

**Non-functional Constraints:** Role mismatch (e.g., a student navigating to `/teacher/lesson-bank`) is handled by the existing auth/route guard; out of scope for this story.

---

## 4. Acceptance Criteria

### UC-01: Lesson Bank allVariant Empty State

**AC-01.1 (Container — role):** Given the lesson bank fetch has completed with an empty list and no filter/search is active, when the component renders, then the empty state container has `role="status"`.

**AC-01.2 (Container — layout):** Given the above, when the container element is inspected, then it has `padding: 40px 20px`, `text-align: center`, and is a centered flex column.

**AC-01.3 (Icon — BookOpen):** Given the allVariant empty state is rendered, when the DOM is inspected, then a `BookOpen` icon is present with `aria-hidden="true"`, 64px size, and color `var(--edu-text-muted)`.

**AC-01.4 (Title — text and style):** Given the allVariant empty state is rendered, when the DOM is inspected, then a `<p>` contains the text from `lessonBank.empty.title` ("Chưa có bài giảng"), `font-size: 16px`, `font-weight: 700`, color `var(--edu-text-primary)`.

**AC-01.5 (Title — no heading element):** Given the allVariant empty state is rendered, when the DOM is inspected, then no `<h2>` or `<h3>` is present inside the empty state container.

**AC-01.6 (Body — text):** Given the allVariant empty state is rendered, when the DOM is inspected, then a `<p>` contains the text from `lessonBank.empty.body` ("Tải lên bài giảng đầu tiên để bắt đầu xây dựng kho.").

**AC-01.7 (Body — contrast-compliant color):** Given the allVariant empty state is rendered, when the body `<p>` is inspected, then its color is `var(--edu-text-secondary)`. `var(--edu-text-muted)` MUST NOT be applied to body text.

**AC-01.8 (Body — max-width):** Given the allVariant empty state is rendered, when the body `<p>` is inspected, then its computed `max-width` is 320px.

**AC-01.9 (CTA — present and labeled):** Given the allVariant empty state is rendered, when the DOM is inspected, then a `<button>` element contains the text from `lessonBank.empty.cta` ("Tải lên bài giảng") and has `variant="primary"` styling applied.

**AC-01.10 (CTA — touch target):** Given the allVariant empty state is rendered, when the CTA button element is measured, then its computed height is at least 44px.

**AC-01.11 (Loading — skeleton shown, not empty state):** Given the lesson bank fetch is pending, when the component renders, then the loading skeleton is present and the `role="status"` container is not present.

**AC-01.12 (Error — error state shown, not empty state):** Given the lesson bank fetch has failed, when the component renders, then the error state is present and the `role="status"` container is not present.

**AC-01.13 (Populated — list shown, not empty state):** Given the lesson bank fetch returns one or more lessons, when the component renders, then the lesson list is shown and the `role="status"` container is not present.

**AC-01.14 (Audit-first — no duplicate component):** Given the FE team has audited the existing `lesson-bank-empty.tsx`, when the implementation is complete, then no new separate component file has been created alongside the existing one. The existing component is upgraded in-place.

---

### UC-02: Lesson Bank filterVariant Empty State

**AC-02.1 (Container — role):** Given a search or filter is active and returns no matching lessons, when the component renders, then the empty state container has `role="status"`.

**AC-02.2 (Icon — Search):** Given the filterVariant empty state is rendered, when the DOM is inspected, then a `Search` icon is present with `aria-hidden="true"`, 64px, color `var(--edu-text-muted)`.

**AC-02.3 (Title — text and style):** Given the filterVariant empty state is rendered, when the DOM is inspected, then a `<p>` contains the text from `lessonBank.empty.noMatch` ("Không tìm thấy bài giảng"), 16px / 700, `var(--edu-text-primary)`.

**AC-02.4 (Body — text):** Given the filterVariant empty state is rendered, when the DOM is inspected, then a `<p>` contains the text from `lessonBank.empty.noMatchBody` ("Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.").

**AC-02.5 (Body — contrast-compliant color):** Given the filterVariant empty state is rendered, when the body `<p>` is inspected, then its color is `var(--edu-text-secondary)`. `var(--edu-text-muted)` MUST NOT be used.

**AC-02.6 (No CTA on filterVariant):** Given the filterVariant empty state is rendered, when the DOM is inspected, then no `<button>` or `<a>` exists inside the empty state container.

**AC-02.7 (allVariant → filterVariant transition):** Given the allVariant empty state is shown (no lessons), when the user enters a search term, then the `BookOpen` icon is replaced by the `Search` icon, the title changes to `lessonBank.empty.noMatch`, and the CTA disappears.

**AC-02.8 (filterVariant → allVariant transition):** Given the filterVariant empty state is shown, when the user clears the search/filter and the lesson list is still empty, then the `Search` icon is replaced by `BookOpen`, the title changes to `lessonBank.empty.title`, and the CTA reappears.

---

### UC-03: Lesson Bank CTA Touch Target

**AC-03.1 (Height ≥44px on desktop):** Given the allVariant empty state is rendered on a 1280px viewport, when the CTA button is measured, then its height is at least 44px.

**AC-03.2 (Height ≥44px on mobile):** Given the allVariant empty state is rendered on a 375px viewport, when the CTA button is measured, then its height is at least 44px.

---

### UC-04: Messaging Empty State

**AC-04.1 (Container — role):** Given no conversation is selected and/or the conversation list is empty, when the messaging screen renders, then the empty state container has `role="status"`.

**AC-04.2 (Container — layout):** Given the above, when the container is inspected, then it has `padding: 40px 20px`, `text-align: center`, and is a centered flex column.

**AC-04.3 (Icon — MessageSquare):** Given the messaging empty state is rendered, when the DOM is inspected, then a `MessageSquare` icon is present with `aria-hidden="true"`, 64px, color `var(--edu-text-muted)`.

**AC-04.4 (Title — text and style):** Given the messaging empty state is rendered, when the DOM is inspected, then a `<p>` contains the text from `messaging.empty.title` ("Chọn một cuộc trò chuyện"), 16px / 700, `var(--edu-text-primary)`.

**AC-04.5 (Title — no heading element):** Given the messaging empty state is rendered, when the DOM is inspected, then no `<h2>` or `<h3>` is present inside the empty state container.

**AC-04.6 (Body — text):** Given the messaging empty state is rendered, when the DOM is inspected, then a `<p>` contains the text from `messaging.empty.subtitle` ("Nhấn vào một cuộc trò chuyện để bắt đầu nhắn tin").

**AC-04.7 (Body — contrast-compliant color):** Given the messaging empty state is rendered, when the body `<p>` is inspected, then its color is `var(--edu-text-secondary)`. `var(--edu-text-muted)` MUST NOT be used.

**AC-04.8 (Body — max-width):** Given the messaging empty state is rendered, when the body `<p>` is inspected, then its computed `max-width` is 320px.

**AC-04.9 (CTA — present and labeled):** Given the messaging empty state is rendered, when the DOM is inspected, then a `<button>` contains the text from `messaging.empty.cta` ("Bắt đầu cuộc hội thoại") with `variant="primary"` styling.

**AC-04.10 (CTA — touch target):** Given the messaging empty state is rendered, when the CTA button is measured, then its computed height is at least 44px.

**AC-04.11 (Loading — skeleton shown, not empty state):** Given the messaging fetch is pending, when the component renders, then the loading skeleton is present and the `role="status"` container is not present.

**AC-04.12 (Error — error state shown, not empty state):** Given the messaging fetch has failed, when the component renders, then the existing error state is present and the `role="status"` container is not present.

**AC-04.13 (Populated — conversation view shown, not empty state):** Given the user selects a conversation, when the messaging screen updates, then the conversation view is shown and the `role="status"` container is not present.

**AC-04.14 (Audit-first — no duplicate component):** Given the FE team has audited the existing `empty-messaging-state.tsx`, when the implementation is complete, then no new separate component file has been created alongside the existing one. The existing component is upgraded in-place.

---

### UC-05: Messaging CTA Touch Target

**AC-05.1 (Height ≥44px on mobile):** Given the messaging empty state is rendered on a 375px viewport, when the CTA button is measured, then its height is at least 44px.

**AC-05.2 (Height ≥44px on desktop):** Given the messaging empty state is rendered on a 1280px viewport, when the CTA button is measured, then its height is at least 44px.

---

### UC-06: Loading and Error States Unchanged

**AC-06.1 (Lesson bank loading — skeleton only):** Given the lesson bank fetch is pending, when the component renders, then the existing skeleton is present and no `role="status"` empty state container is present.

**AC-06.2 (Lesson bank error — error state only):** Given the lesson bank fetch has failed, when the component renders, then the existing error state is present and no `role="status"` container is present.

**AC-06.3 (Messaging loading — skeleton only):** Given the messaging fetch is pending, when the component renders, then the existing skeleton is present and no `role="status"` empty state container is present.

**AC-06.4 (Messaging error — error state only):** Given the messaging fetch has failed, when the component renders, then the existing error state is present and no `role="status"` container is present.

---

### UC-07: Role Access

**AC-07.1 (Principal — lesson bank allVariant, no CTA):** Given a Principal is authenticated and the lesson bank returns an empty list, when the allVariant empty state renders, then the `BookOpen` icon and `lessonBank.empty.title` title are shown, but the CTA button is not rendered (Principal has read-only access and cannot upload).

**AC-07.2 (Teacher — lesson bank allVariant, CTA present):** Given a Teacher is authenticated and the lesson bank returns an empty list, when the allVariant empty state renders, then the CTA button with `lessonBank.empty.cta` label is present.

**AC-07.3 (Student — messaging empty state shown):** Given a Student is authenticated and opens `/student/messaging` with no conversations, when the messaging empty state renders, then the `MessageSquare` icon, `messaging.empty.title`, and CTA are shown.

**AC-07.4 (Parent — messaging empty state shown):** Given a Parent is authenticated and opens `/parent/messaging` with no conversations, when the messaging empty state renders, then the `MessageSquare` icon, `messaging.empty.title`, and CTA are shown.

---

## 5. Edge Case Matrix

| Scenario | Lesson bank allVariant | Lesson bank filterVariant | Messaging empty state | Loading (both) | Error (both) |
|---|---|---|---|---|---|
| Normal empty | BookOpen 64px, title, body `text-secondary`, CTA ≥44px | Search 64px, noMatch title, body `text-secondary`, no CTA | MessageSquare 64px, title, body `text-secondary`, CTA ≥44px | Skeleton only | Error state only |
| Lessons exist | Lesson list shows | — | — | Skeleton | Error state |
| Filter returns results | — | Filtered list shows | — | Skeleton | Error state |
| allVariant → filterVariant (search applied) | CTA disappears, icon/copy switch | — | N/A | N/A | N/A |
| filterVariant → allVariant (clear search, still empty) | CTA reappears, icon/copy switch | — | N/A | N/A | N/A |
| Body color = `text-muted` | Defect (3.08:1 < 4.5:1) | Same defect | Same defect | N/A | N/A |
| CTA height < 44px | Defect (WCAG 2.5.5) | N/A | Same defect | N/A | N/A |
| Auth expired during fetch | Redirect to login | Same | Same | Same | Same |
| Network error | Error state | Same | Error state | Same | Error state |
| 320px viewport | No overflow; body max-width 320px; CTA full-width allowed | Same | Same | Same | Same |
| Principal role (lesson bank) | Empty state renders, CTA hidden | Empty state, no CTA | N/A | N/A | N/A |
| Student/Parent (lesson bank) | No route (route guard blocks) | Same | N/A | N/A | N/A |
| Duplicate component created | Defect — audit-first rule violated | Same | Same | N/A | N/A |
| Max-length body text | Wraps at max-width 320px | Same | Same | N/A | N/A |
| Concurrent fetch (filter change mid-flight) | Last fetch result wins; no stale state | Same | N/A | N/A | N/A |

---

## 6. Open Questions

[OPEN QUESTION OQ-01] The requirements state the Principal has read-only access to the lesson bank. Is the CTA hidden (DOM removed) or disabled (visible but non-interactive) for the Principal role? The current AC (AC-07.1) models it as hidden (not rendered). If the Principal should see a disabled CTA as a hint, a new i18n key and design review would be needed — this should be confirmed by the BA lead before implementation.

[OPEN QUESTION OQ-02] The messaging CTA ("Bắt đầu cuộc hội thoại") is expected to open a new-conversation modal. What is the exact trigger mechanism — a callback prop passed to the empty state component, or a router event? The empty state component should not import navigation directly (Clean Architecture presentation layer constraint). The FE team needs to know whether the CTA fires a prop-passed `onStartConversation` callback, a URL push, or a context action.

[OPEN QUESTION OQ-03] For the lesson bank `filterVariant`, does the empty state appear while the filter/search fetch is still pending, or only after the filtered fetch resolves? If the debounce logic causes a momentary render of the previous state, the state machine should clarify whether the loading skeleton replaces the filterVariant during re-fetches. This affects AC-02.7 and AC-02.8 transition timing.

[OPEN QUESTION OQ-04] The messaging empty state i18n key `messaging.empty.subtitle` uses "subtitle" in the key name, while the body in the canonical pattern is semantically `body`. If a future refactor renames the key to `messaging.empty.body`, this will break the existing translation binding. Should the key name be standardized now (new key `messaging.empty.body` + deprecate `messaging.empty.subtitle`)? If yes, that requires a vi.json / en.json change and is outside this story's zero-new-keys constraint — flag for BA lead.
