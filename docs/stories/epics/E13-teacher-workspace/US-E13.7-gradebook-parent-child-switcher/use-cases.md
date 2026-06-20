# US-E13.7 Use Cases + Acceptance Criteria
# Grade Book Parent Child-Switcher

Produced by: ba-use-case-modeler
Depends on: US-E13.6 (implemented, 739 tests passing)

---

## 1. Use Case Scope Summary

| # | Use Case | Primary Actor | Async? |
|---|----------|---------------|--------|
| UC-1 | Single-child parent loads /parent/grades | parent | yes |
| UC-2 | Multi-child parent loads /parent/grades | parent | yes |
| UC-3 | Parent switches active child (mouse/pointer) | parent | yes |
| UC-4 | Child-switch fetch fails | parent | yes |
| UC-5 | Active child has gradePublishMode=ADMIN_APPROVAL | parent | yes |
| UC-6 | Keyboard navigation within ChildSwitcher | parent | yes |
| UC-7 | Non-parent role visits their grade book route | teacher / principal / student | yes |

Total: 7 use cases. All four async UI states (loading / empty / error / success) are covered.
Role variants: parent (primary), all other roles (negative regression guard).
Boundaries: read-only. No mutations. ChildSwitcher is local to /parent/grades. No changes to
other role routes.

---

## 2. Actor Catalogue

| Actor / Role | Type | Capabilities in this story |
|---|---|---|
| parent | Primary human actor | Reads grade book for each linked child; switches active child via ChildSwitcher; keyboard-navigates between tabs |
| teacher | Human actor (out of scope) | Accesses /teacher/grades; must not see ChildSwitcher; existing behavior must not regress |
| principal | Human actor (out of scope) | Accesses /principal/grades; must not see ChildSwitcher; existing behavior must not regress |
| student | Human actor (out of scope) | Accesses /student/grades; must not see ChildSwitcher; existing behavior must not regress |
| GetChildListUseCase | System actor | Fetches [{childId, name, className, avatar, color}] for the authenticated parent (mock-first via MockGradeBookRepository.getChildList()) |
| GetChildGradesUseCase | System actor | Fetches GradeBookRow[] + publishMode for a given (childId, term); already wired from US-E13.6 |
| MockGradeBookRepository | System actor | Returns VIEWER_CHILDREN + VIEWER_DATA_BY_CHILD seed data; extended in this story to be childId-aware |

---

## 3. Use Case Catalogue

---

### UC-1: Single-child parent loads /parent/grades

**ID:** UC-1
**Title:** Single-child parent loads grade book — no switcher
**Primary actor:** parent
**Secondary actors:** GetChildListUseCase, GetChildGradesUseCase
**Preconditions:**
- Parent is authenticated (valid auth_token cookie).
- Parent's childrenList returned by getChildList() contains exactly 1 child.
- /parent/grades route is active.

**Main success scenario:**
1. ParentGradeBookScreen mounts; getChildList() is called.
2. Response returns [child0].
3. childrenList.length === 1: ChildSwitcher component is NOT instantiated or rendered.
4. activeChildId is set to child0.childId silently (no user interaction required).
5. getChildGrades(child0.childId, selectedTerm) is called.
6. GradeBookSkeleton shown during fetch.
7. On success: GradeBookTable renders with child0's subjects, scores, and GPA.
8. Screen is behaviorally identical to US-E13.6 ParentView_SingleRow.

**Alternative flows:**
- A1 (child list loading): While getChildList() is pending, a page-level skeleton is shown; no partial ChildSwitcher appears.
- A2 (empty child list — 0 children): getChildList() returns []. GradeBookTable shows empty state ("Chưa có dữ liệu bảng điểm"). ChildSwitcher is not rendered. See OQ-002.

**Exception flows:**
- E1 (getChildList fails — network-error): ErrorBanner shown with retry button; key gradeBook.error.network-error (vi/en). GradeBookTable not rendered.
- E2 (getChildList fails — forbidden): ErrorBanner shown without retry button; key gradeBook.error.forbidden.
- E3 (getChildGrades fails after child resolved): See UC-4.

**Business rules:**
- BR-001: ChildSwitcher MUST NOT render when childrenList.length < 2. This is a hard guard protecting US-E13.6 single-child regression.
- BR-007: No mutations are permitted on this route.

**Non-functional constraints:**
- GradeBookSkeleton appears within 320ms of mount (NFR-004).
- No layout shift between skeleton and populated table.

---

### UC-2: Multi-child parent loads /parent/grades

**ID:** UC-2
**Title:** Multi-child parent loads grade book — switcher renders with first child active
**Primary actor:** parent
**Secondary actors:** GetChildListUseCase, GetChildGradesUseCase
**Preconditions:**
- Parent is authenticated.
- getChildList() returns N children where N >= 2.
- /parent/grades route is active.

**Main success scenario:**
1. ParentGradeBookScreen mounts; getChildList() is called.
2. Loading state: skeleton or spinner shown; ChildSwitcher is NOT yet rendered.
3. Response returns [child0, child1, ..., childN-1].
4. childrenList.length >= 2: ChildSwitcher is rendered.
5. ChildSwitcher renders a vertical card (role="tablist") with N tab buttons (role="tab").
6. Tab[0] is active by default: aria-selected="true"; border 1.5px solid child0.color; background child0.color + '14'.
7. Tab[1..N-1] are inactive: aria-selected="false"; border 1.5px solid var(--edu-border); background var(--edu-card).
8. Section label rendered above tabs: key gradeBook.childSwitcherLabel (vi: "Chọn con"); 10.5px/800/muted/UPPERCASE/letter-spacing 0.08em.
9. Each tab renders: Avatar (26px, initials from child.avatar, color = child.color) + child.name (12.5px/800/text-primary) + child.className (10.5px/muted).
10. getChildGrades(child0.childId, selectedTerm) is called automatically.
11. GradeBookSkeleton shown during fetch.
12. On success: GradeBookTable renders with child0's data. The tabpanel (role="tabpanel") is associated with the active tab.

**Alternative flows:**
- A1 (exactly 2 children): Same flow; only 2 tabs rendered.
- A2 (3+ children): Same flow; all children rendered as tabs; no horizontal scroll at 320px viewport width (NFR-006).

**Exception flows:**
- E1 (getChildList fails): ErrorBanner shown; ChildSwitcher not rendered. See UC-1 E1/E2.
- E2 (initial getChildGrades fails): See UC-4.

**Business rules:**
- BR-002: First child in the list (index 0) is always the default active child on mount.
- BR-003: Each tab button represents exactly one child.
- BR-006: gradePublishMode gate applies per the active child's data; see UC-5.
- BR-007: Read-only; no mutations.

**Non-functional constraints:**
- role="tablist" on container; role="tab" on each button; role="tabpanel" on the table wrapper.
- aria-selected="true" on active tab; "false" on all others.
- Each tab button: min touch target 44x44px (NFR-002).
- Visible focus ring using --ring token on focused tab (NFR-002).
- Active state must not be communicated by color alone: aria-selected provides the non-visual signal (NFR-003).
- ChildSwitcher section label uses i18n key gradeBook.childSwitcherLabel; no new key (NFR-007).
- No horizontal scroll at 320px (NFR-006).

---

### UC-3: Parent switches to another child (mouse/pointer)

**ID:** UC-3
**Title:** Parent clicks a different child tab — grade book refreshes
**Primary actor:** parent
**Secondary actors:** GetChildGradesUseCase
**Preconditions:**
- UC-2 has completed successfully (ChildSwitcher rendered; child0 active).
- Parent is on /parent/grades.

**Main success scenario:**
1. Parent clicks tab[1] (child1).
2. activeChildId updates to child1.childId immediately (optimistic tab activation).
3. tab[1] visually becomes active: aria-selected="true"; border 1.5px solid child1.color; background child1.color + '14'.
4. tab[0] becomes inactive: aria-selected="false"; border 1.5px solid var(--edu-border).
5. GradeBookSkeleton replaces the previous GradeBookTable content within 320ms.
6. getChildGrades(child1.childId, selectedTerm) is called.
7. TanStack Query key ['gradeBook', 'child', child1.childId, selectedTerm] is used; cache hit avoids re-fetch if data was previously loaded.
8. On success: GradeBookTable renders with child1's subjects, scores, and GPA.
9. GPA, rank distribution, and conduct grade reflect child1's data exclusively.
10. ChildSwitcher remains visible throughout (no unmount during fetch).

**Alternative flows:**
- A1 (switching back to child0): Same flow; if child0 data is cached in TanStack Query, skeleton may not appear (instant render from cache). No fetch triggered if cache is fresh.
- A2 (term selector changes while child1 is active): getChildGrades(child1.childId, newTerm) is called; child selection does not reset.
- A3 (rapid successive clicks — tab[1] then tab[2] before first resolves): Only the last clicked child's fetch result is applied; earlier in-flight requests are abandoned (React Query cancellation or query key supersedes).

**Exception flows:**
- E1 (fetch fails): See UC-4.

**Business rules:**
- BR-004: Each child's grade data is fully isolated — child1's scores, GPA, rank, and publishMode must not bleed into child0's view and vice versa.
- BR-005: Switching children does not reset the term selector.
- BR-007: Read-only.

**Non-functional constraints:**
- Skeleton appears within 320ms of tab click (NFR-004).
- No layout shift on switch (ChildSwitcher card stays fixed; only GradeBookTable area refreshes).
- All transitions gated behind @media (prefers-reduced-motion: reduce): when reduced-motion is set, transition is instant (NFR-008).

---

### UC-4: Child-switch fetch fails

**ID:** UC-4
**Title:** getChildGrades fails after tab switch — error state with recovery options
**Primary actor:** parent
**Secondary actors:** GetChildGradesUseCase
**Preconditions:**
- ChildSwitcher is rendered; parent has clicked a tab.
- The outgoing getChildGrades call fails with one of: network-error, not-found, forbidden, unknown.

**Main success scenario (network-error):**
1. Parent clicks tab[N]; GradeBookSkeleton shown.
2. getChildGrades fails with failure type "network-error".
3. Skeleton is replaced by ErrorBanner.
4. ErrorBanner displays i18n message mapped from "network-error" (vi: "Lỗi kết nối. Vui lòng thử lại.").
5. A retry button is shown (i18n key gradeBook.error.retry or equivalent existing key).
6. ChildSwitcher remains fully visible and interactive; the active tab remains on the failed child.
7. Parent clicks retry: GradeBookSkeleton shown again; getChildGrades re-called.
8. On success: GradeBookTable renders with the correct child's data.

**Alternative flows:**
- A1 (forbidden failure): ErrorBanner shown; NO retry button; message from gradeBook.error.forbidden. ChildSwitcher still visible; parent can select a different child.
- A2 (not-found failure): ErrorBanner shown; no retry button (data genuinely absent); message from gradeBook.error.not-found.
- A3 (unknown failure): ErrorBanner shown with retry; message from gradeBook.error.unknown.
- A4 (initial load of child0 fails): Same error handling as above; ChildSwitcher still rendered if child list loaded successfully.

**Exception flows:**
- E1 (retry also fails): Error state shown again; retry button remains available.

**Business rules:**
- BR-004: A failure for child1 does not corrupt the previously loaded child0 data (if parent switches back to child0, its cached data remains intact).
- BR-007: Read-only.

**Non-functional constraints:**
- ChildSwitcher must not be unmounted or visually degraded during/after the error state.
- Error message text must be provided in both vi and en.
- retry=true only for network-error and unknown; retry=false for forbidden and not-found (maps to backend retryable flag).

---

### UC-5: Active child has gradePublishMode=ADMIN_APPROVAL

**ID:** UC-5
**Title:** Parent views a child whose grades are unpublished — locked banner + masked scores
**Primary actor:** parent
**Secondary actors:** GetChildGradesUseCase
**Preconditions:**
- ChildSwitcher is rendered with >= 2 children.
- child0's grade response has gradePublishMode=ADMIN_APPROVAL and at least one null/masked score cell.
- child1's grade response has gradePublishMode=SELF_PUBLISH with fully published scores.

**Main success scenario:**
1. UC-2 completes; child0 is active.
2. child0's data has ADMIN_APPROVAL mode.
3. LockedBanner is rendered above GradeBookTable: vi "Điểm học kỳ này chưa được công bố" (existing key gradeBook.lockedBanner or equivalent from US-E13.6).
4. Score cells that are unpublished are masked (display "--" or equivalent design-spec treatment).
5. Parent clicks tab[1] (child1); UC-3 flow executes.
6. child1's data has SELF_PUBLISH mode.
7. LockedBanner is NOT rendered for child1.
8. All of child1's score cells display actual values.
9. Parent clicks back to tab[0] (child0).
10. LockedBanner reappears; masked cells reappear for child0.

**Alternative flows:**
- A1 (both children have ADMIN_APPROVAL): LockedBanner shown for both; switching between tabs always shows the banner.
- A2 (child has ADMIN_APPROVAL but all scores are published — edge case): LockedBanner NOT shown (condition is mode AND incomplete data); GradeBookTable shows all scores normally.

**Exception flows:**
- E1 (fetch for child with ADMIN_APPROVAL fails): UC-4 error handling takes precedence; LockedBanner does not appear during error state.

**Business rules:**
- BR-006: gradePublishMode gate is evaluated per active child's data response, not as a global flag. Switching children re-evaluates the gate.
- BR-007: Read-only.

**Non-functional constraints:**
- Locked state is not communicated by color alone: LockedBanner includes a lock icon + text label (a11y).
- Warning color on banner uses --edu-warning token with --edu-warning-foreground text (not white on yellow — accessibility rule, decision 0013).

---

### UC-6: Keyboard navigation within ChildSwitcher

**ID:** UC-6
**Title:** Parent navigates ChildSwitcher using keyboard — ArrowLeft/Right focus, Enter/Space activate
**Primary actor:** parent
**Secondary actors:** GetChildGradesUseCase (triggered only on activation)
**Preconditions:**
- ChildSwitcher is rendered with >= 2 tab buttons.
- Keyboard focus is on one of the tab buttons.

**Main success scenario:**
1. Focus is on tab[0].
2. Parent presses ArrowRight: focus moves to tab[1]. No fetch is triggered. aria-selected remains on tab[0].
3. Parent presses ArrowRight again (from tab[N-1], the last tab): focus wraps to tab[0]. No fetch triggered.
4. Parent presses ArrowLeft from tab[0]: focus wraps to tab[N-1]. No fetch triggered.
5. Parent presses Enter (or Space) on tab[1]: tab[1] is activated. aria-selected moves to tab[1]. UC-3 fetch flow begins.
6. Focus ring is visible on the focused (but not yet activated) tab.

**Alternative flows:**
- A1 (Tab key): Pressing Tab while focus is within ChildSwitcher moves focus OUT of ChildSwitcher to the next focusable element on the page (standard tab order; does not cycle through ChildSwitcher tabs).
- A2 (focus lands on ChildSwitcher from outside via Tab): Focus lands on the currently active tab button first (roving tabindex pattern: active tab has tabindex=0, inactive tabs have tabindex=-1).
- A3 (mouse click and keyboard nav interleaved): After a mouse click on tab[1], keyboard ArrowRight from tab[1] correctly moves focus to tab[2] (focus tracking kept in sync with active state).
- A4 (only 2 children): ArrowRight from tab[0] → tab[1]; ArrowRight from tab[1] → wraps to tab[0]. ArrowLeft from tab[0] → wraps to tab[1].

**Exception flows:**
- E1 (fetch triggered by Enter fails): UC-4 error handling applies; focus remains on the activated tab button.

**Business rules:**
- BR-009: ArrowLeft/ArrowRight move focus only; they do NOT trigger a fetch. Only Enter and Space activate the tab and trigger a fetch.
- BR-010: Roving tabindex pattern: active tab has tabindex=0; all other tabs have tabindex=-1.
- BR-011: Boundary wrapping is required at both ends.

**Non-functional constraints:**
- Focus ring must be visible using --ring token (NFR-002); MUST NOT be suppressed with outline:none without a visible replacement.
- ARIA: role="tablist" on container; role="tab" on each button; aria-selected on each tab; aria-controls pointing to the tabpanel id; role="tabpanel" on GradeBookTable wrapper.
- WCAG 2.1 AA keyboard operability requirement (success criterion 2.1.1).

---

### UC-7: Non-parent roles — no ChildSwitcher rendered

**ID:** UC-7
**Title:** Teacher / principal / student accesses their grade book — ChildSwitcher absent
**Primary actor:** teacher (representative; applies equally to principal and student)
**Secondary actors:** none (ChildSwitcher-specific)
**Preconditions:**
- Authenticated user has role teacher, principal, or student.
- User is on their role-appropriate grade book route (/teacher/grades, /principal/grades, /student/grades).

**Main success scenario:**
1. GradeBookScreen renders for the user's role.
2. GradeBookScreenVM.role is not "parent".
3. ChildSwitcher component is not instantiated anywhere in the rendered tree.
4. No element with role="tablist" related to child-switching is present in the DOM.
5. All US-E13.6 behaviors (loading, table structure, score colors, selectors, empty, error, a11y) are unchanged.
6. All 739 US-E13.6 tests pass.

**Alternative flows:**
- A1 (user has parent + teacher dual roles): After /select-role the user chose teacher; only teacher workspace is active. ChildSwitcher must not appear. This is a routing/session concern; no ChildSwitcher is rendered outside /parent/grades.

**Exception flows:** none specific to this UC.

**Business rules:**
- BR-008: ChildSwitcher is scoped exclusively to the parent role's view branch in GradeBookScreen/ParentGradeBookScreen. It is never conditionally shown for other roles.

---

## 4. Acceptance Criteria

### UC-1: Single-child parent loads /parent/grades

**AC-1.1 — Loading state (getChildList pending)**
Given the parent user navigates to /parent/grades,
When getChildList() is in flight,
Then the screen displays a loading skeleton or spinner;
And no ChildSwitcher element with role="tablist" is present in the DOM.

**AC-1.2 — Success: switcher absent when one child**
Given getChildList() resolves with exactly one child,
When the screen finishes loading,
Then no element with role="tablist" is rendered;
And no ChildSwitcher card (minWidth 180, borderRadius 12, border 1px solid var(--edu-border)) is rendered;
And GradeBookTable is rendered with the single child's data;
And the screen is visually and behaviorally identical to US-E13.6 ParentView_SingleRow Storybook story.

**AC-1.3 — Success: single child's grades load automatically**
Given getChildList() resolves with [child0],
When the page loads,
Then getChildGrades is called with child0.childId and the selected term;
And GradeBookTable renders with child0's subjects, scores, and GPA;
And no user interaction is required to trigger this fetch.

**AC-1.4 — Error: getChildList fails (network-error)**
Given the parent navigates to /parent/grades,
When getChildList() fails with error type "network-error",
Then an ErrorBanner is displayed with the vi message "Lỗi kết nối. Vui lòng thử lại.";
And a retry button is present and keyboard-operable;
And GradeBookTable is not rendered;
And ChildSwitcher is not rendered.

**AC-1.5 — Error: getChildList fails (forbidden)**
Given getChildList() fails with error type "forbidden",
When the error state renders,
Then an ErrorBanner is displayed with the vi message from gradeBook.error.forbidden;
And no retry button is rendered.

**AC-1.6 — Empty: getChildList returns empty array**
Given getChildList() resolves with [],
When the screen finishes loading,
Then an empty state message is displayed (no grade data available);
And ChildSwitcher is not rendered;
And GradeBookTable is not rendered.
[OPEN QUESTION: OQ-002 — what is the exact empty-state copy key for 0 children? Confirm with ba-lead whether gradeBook.empty or a new key is needed. Do not add a new i18n key without confirmation.]

---

### UC-2: Multi-child parent loads /parent/grades

**AC-2.1 — Loading state (initial fetch pending)**
Given the parent navigates to /parent/grades and getChildList() is pending,
When the screen is in loading state,
Then a skeleton or spinner is shown;
And no partial ChildSwitcher renders before the child list resolves.

**AC-2.2 — ChildSwitcher renders for multi-child parent**
Given getChildList() resolves with N children (N >= 2),
When the ChildSwitcher mounts,
Then a container element with role="tablist" is present in the DOM;
And it contains exactly N elements with role="tab";
And the container has visual design: borderRadius 12, border 1px solid var(--edu-border), padding 12, flexDirection column, gap 6, minWidth 180, background var(--edu-card).

**AC-2.3 — Section label rendered correctly**
Given the ChildSwitcher is rendered,
Then a label element is rendered with text from i18n key gradeBook.childSwitcherLabel (vi: "Chọn con");
And it is styled 10.5px/800/muted/UPPERCASE/letter-spacing 0.08em.

**AC-2.4 — First child is active by default**
Given getChildList() resolves with [child0, child1, ...],
When the ChildSwitcher renders,
Then tab[0] has aria-selected="true";
And tab[0] has border 1.5px solid child0.color and background child0.color + '14' (#14 hex = ~8% opacity);
And tab[1] through tab[N-1] have aria-selected="false";
And tab[1] through tab[N-1] have border 1.5px solid var(--edu-border) and background var(--edu-card).

**AC-2.5 — Tab content rendered correctly**
Given the ChildSwitcher is rendered with child data [{childId, name, className, avatar, color}],
Then each tab contains:
  (a) an Avatar of 26px size with the child's initials (child.avatar) and child.color,
  (b) a name label in 12.5px/800/text-primary,
  (c) a className label in 10.5px/text-muted;
And all three are visible in both vi and en locales.

**AC-2.6 — First child's grades loaded automatically**
Given tab[0] is the default active tab,
When the screen loads,
Then getChildGrades is called with child0.childId and the current term;
And GradeBookTable is populated with child0's subjects, scores, and GPA;
And the GradeBookTable wrapper has role="tabpanel" and is associated with tab[0] via aria-controls / aria-labelledby.

**AC-2.7 — Touch target size**
Given the ChildSwitcher is rendered on a mobile viewport,
Then each tab button has a minimum tappable area of 44x44px (padding included).

**AC-2.8 — No horizontal scroll at 320px**
Given the viewport width is 320px,
When the ChildSwitcher is rendered with any number of children,
Then no horizontal scrollbar appears on the ChildSwitcher card or the page;
And all child tab content is fully readable (no overflow clip on names or class labels).

---

### UC-3: Parent switches to another child (mouse/pointer)

**AC-3.1 — Loading state on switch**
Given the ChildSwitcher is rendered with child0 active,
When the parent clicks tab[1],
Then GradeBookSkeleton replaces the current GradeBookTable content within 320ms;
And the skeleton has no layout shift relative to the previous table position.

**AC-3.2 — aria-selected updates on click**
Given the parent clicks tab[1],
Then tab[1] immediately has aria-selected="true";
And tab[0] immediately has aria-selected="false";
And the visual active border/background of tab[1] updates to 1.5px solid child1.color and child1.color + '14';
And the visual style of tab[0] reverts to 1.5px solid var(--edu-border) and var(--edu-card).

**AC-3.3 — GradeBookTable refreshes with child1 data**
Given getChildGrades(child1.childId, term) resolves successfully,
When the fetch completes,
Then GradeBookTable displays child1's subjects, scores, and GPA;
And none of child0's subjects, scores, or GPA values are shown;
And the tabpanel is associated with the newly active tab.

**AC-3.4 — TanStack Query key changes on switch**
Given the parent switches from child0 to child1,
Then the TanStack Query key used for the grade fetch changes from
  ['gradeBook', 'child', child0.childId, term]
  to ['gradeBook', 'child', child1.childId, term];
And if child1's data is cached, no network request is made and skeleton is skipped.

**AC-3.5 — Term selector does not reset on child switch**
Given the parent has selected term "HK2" and then switches active child,
Then the term selector remains on "HK2";
And the new child's grades are fetched for "HK2".

**AC-3.6 — ChildSwitcher remains visible during and after switch**
Given the parent clicks a new tab,
Throughout the loading and success states,
Then the ChildSwitcher card is always visible and interactive;
And it is never unmounted during the fetch lifecycle.

**AC-3.7 — Reduced-motion gate on switch transition**
Given the user's OS has prefers-reduced-motion: reduce set,
When the parent switches children,
Then any CSS transition on the GradeBookTable area is instant (0ms or removed);
And no animation plays on the ChildSwitcher tab active state change.

---

### UC-4: Child-switch fetch fails

**AC-4.1 — Error state: network-error with retry**
Given the parent clicks tab[N] and getChildGrades fails with "network-error",
When the error state renders,
Then the GradeBookSkeleton is replaced by an ErrorBanner;
And the ErrorBanner displays the vi message from gradeBook.error.network-error (vi: "Lỗi kết nối. Vui lòng thử lại.");
And a retry button is rendered and keyboard-operable (reachable via Tab key, activatable via Enter/Space);
And the ChildSwitcher card remains fully visible.

**AC-4.2 — Error state: forbidden — no retry**
Given getChildGrades fails with "forbidden",
When the error state renders,
Then an ErrorBanner is shown with the vi message from gradeBook.error.forbidden;
And no retry button is rendered;
And the parent can click a different child tab to switch.

**AC-4.3 — Retry recovers to success**
Given the parent is in the network-error state for tab[N],
When the parent clicks the retry button,
Then GradeBookSkeleton is shown;
And getChildGrades is re-called with the same childId and term;
And on success GradeBookTable renders child[N]'s data.

**AC-4.4 — Failed child does not corrupt cached child data**
Given child0 was successfully loaded and the parent switches to child1 which fails,
When the parent clicks back to tab[0],
Then getChildGrades for child0 is served from TanStack Query cache;
And GradeBookTable renders child0's previously loaded data without a new network request.

**AC-4.5 — Error messages in both locales**
Given the error state is active,
Then the ErrorBanner message is localized:
  vi: matches the value of gradeBook.error.<failureType> in vi.json;
  en: matches the value of gradeBook.error.<failureType> in en.json;
And no raw failure type code (e.g. "network-error") is displayed to the user.

---

### UC-5: Active child has gradePublishMode=ADMIN_APPROVAL

**AC-5.1 — LockedBanner shown for unpublished child**
Given child0's grade response has gradePublishMode=ADMIN_APPROVAL and at least one unpublished score,
When child0 is the active tab,
Then a LockedBanner is rendered above GradeBookTable;
And the banner contains both a lock icon and a text label (not color alone);
And the banner background uses --edu-warning token; the text uses --edu-warning-foreground (not white);
And unpublished score cells are masked (display "--" or the design-spec treatment).

**AC-5.2 — LockedBanner absent for published child**
Given child1's grade response has gradePublishMode=SELF_PUBLISH with all scores published,
When the parent switches to tab[1],
Then LockedBanner is NOT present in the DOM for child1's tabpanel;
And all score cells display their numeric values.

**AC-5.3 — LockedBanner re-appears on switch back**
Given the parent was on child0 (ADMIN_APPROVAL) then switched to child1 (SELF_PUBLISH) then switches back to child0,
When child0's tab is re-activated,
Then LockedBanner re-renders;
And masked score cells are masked again;
And child1's data is no longer visible.

**AC-5.4 — Banner is per-child, not global**
Given child0 has ADMIN_APPROVAL and child1 has SELF_PUBLISH,
When the parent views both children in succession,
Then the LockedBanner state is determined solely by the active child's gradePublishMode;
And switching children correctly toggles the banner without any persistent global state.

---

### UC-6: Keyboard navigation within ChildSwitcher

**AC-6.1 — ArrowRight moves focus, does not fetch**
Given focus is on tab[0] in the ChildSwitcher,
When the parent presses ArrowRight,
Then focus moves to tab[1];
And aria-selected remains "true" on tab[0] and "false" on tab[1];
And no getChildGrades fetch is triggered.

**AC-6.2 — ArrowLeft moves focus, does not fetch**
Given focus is on tab[1] in the ChildSwitcher,
When the parent presses ArrowLeft,
Then focus moves to tab[0];
And aria-selected is unchanged;
And no fetch is triggered.

**AC-6.3 — ArrowRight wraps from last tab to first**
Given focus is on the last tab (tab[N-1]),
When the parent presses ArrowRight,
Then focus wraps to tab[0];
And no fetch is triggered.

**AC-6.4 — ArrowLeft wraps from first tab to last**
Given focus is on tab[0],
When the parent presses ArrowLeft,
Then focus wraps to tab[N-1];
And no fetch is triggered.

**AC-6.5 — Enter activates focused tab and triggers fetch**
Given focus is on tab[1] (not currently active),
When the parent presses Enter,
Then tab[1] becomes active: aria-selected="true" on tab[1], "false" on all others;
And getChildGrades(child1.childId, term) is triggered;
And the fetch lifecycle (loading/success/error) follows UC-3 / UC-4.

**AC-6.6 — Space activates focused tab and triggers fetch**
Given focus is on tab[1] (not currently active),
When the parent presses Space,
Then the same behavior as AC-6.5 occurs;
And the page does not scroll (Space default scroll behavior is prevented on role="tab").

**AC-6.7 — Roving tabindex: only active tab is in natural tab order**
Given the ChildSwitcher is rendered,
Then the currently active tab button has tabindex=0;
And all inactive tab buttons have tabindex=-1;
When the parent uses the Tab key from outside the ChildSwitcher,
Then focus lands on the active tab button, not on tab[0] if a different tab is active.

**AC-6.8 — Focus ring visible on focused tab**
Given any tab button is focused (via keyboard),
Then a visible focus ring is rendered using the --ring CSS token;
And outline is NOT set to "none" without a visible replacement.

**AC-6.9 — Tab key exits ChildSwitcher**
Given focus is on any tab button in the ChildSwitcher,
When the parent presses Tab (not ArrowRight),
Then focus moves to the next focusable element outside the ChildSwitcher in DOM order;
And focus does NOT cycle through remaining tab buttons.

---

### UC-7: Non-parent roles — no ChildSwitcher

**AC-7.1 — Teacher role: no tablist in DOM**
Given an authenticated user with role "teacher" is on /teacher/grades,
Then no element with role="tablist" related to child-switching is present in the DOM;
And the grade book screen renders the teacher-role view as per US-E13.6 AC-5.

**AC-7.2 — Principal role: no tablist in DOM**
Given an authenticated user with role "principal" is on /principal/grades,
Then no element with role="tablist" related to child-switching is present in the DOM.

**AC-7.3 — Student role: no tablist in DOM**
Given an authenticated user with role "student" is on /student/grades,
Then no element with role="tablist" related to child-switching is present in the DOM;
And the student single-row view renders as per US-E13.6 AC-6.

**AC-7.4 — US-E13.6 regression guard**
Given US-E13.7 code changes are applied,
When the full US-E13.6 test suite runs,
Then all 739 tests pass with no failures or skips introduced by this story.

---

## 5. Edge Case Matrix

| Scenario | childrenList | Expected behavior |
|---|---|---|
| 0 children (empty list) | [] | Empty state shown; ChildSwitcher NOT rendered; GradeBookTable NOT rendered. [OQ-002: confirm copy key] |
| 1 child (base single) | [child0] | ChildSwitcher NOT rendered; GradeBookTable loads child0 data automatically; US-E13.6 regression unchanged |
| 2 children (base multi) | [child0, child1] | ChildSwitcher renders 2 tabs; child0 active by default; ArrowRight wraps from tab[1] to tab[0] |
| 3+ children | [c0, c1, c2, ...] | All N tabs rendered; no horizontal scroll at 320px; wrap-around at both ends |
| Active child has ADMIN_APPROVAL | child0.publishMode = ADMIN_APPROVAL | LockedBanner shown; masked cells; absent for other children |
| Network error on switch | getChildGrades fails (network-error) | ErrorBanner + retry; ChildSwitcher stays visible; other children's cached data unaffected |
| Forbidden on switch | getChildGrades fails (forbidden) | ErrorBanner without retry; parent can switch to another child |
| Keyboard nav at last tab + ArrowRight | focus on tab[N-1] | Focus wraps to tab[0]; no fetch; aria-selected unchanged |
| Keyboard nav at first tab + ArrowLeft | focus on tab[0] | Focus wraps to tab[N-1]; no fetch; aria-selected unchanged |
| Auth token expired during fetch | 401 TOKEN_EXPIRED | Proactive/reactive refresh (existing bootstrap/lib behavior); on success retry the original getChildGrades call; if refresh fails redirect to /login |
| Rapid tab switching before fetch resolves | click tab[1] then tab[2] rapidly | Only child2 fetch result applies; stale child1 result is discarded; child2 tab is active |
| Reduced-motion preference | prefers-reduced-motion: reduce | All transitions on switch are instant; no animation on active state change |
| 320px viewport with 3+ children | viewport = 320px, N=3 | No horizontal scroll; tab card stacks vertically; names truncate with text-overflow: ellipsis if needed; no clipped touch targets |
| Non-parent role (teacher/principal/student) | N/A | ChildSwitcher absent; no tablist in DOM; 739 US-E13.6 tests pass |

---

## 6. Storybook Stories Required

The following four Storybook interaction stories are required as proof of UC coverage (from story.md Validation section):

| Story name | Maps to | Purpose |
|---|---|---|
| ParentView_SingleChild | UC-1 AC-1.2 | Regression guard: ChildSwitcher absent; single child grade book renders; no tablist in DOM. Confirms US-E13.6 ParentView_SingleRow parity. |
| ParentView_MultiChild_Tab1 | UC-2 AC-2.4 / AC-2.5 / AC-2.6 | Default multi-child state: ChildSwitcher rendered; child0 (Nguyễn Minh Khoa / 11A2) active; 2 tabs; correct ARIA; grade data for child0 in table. |
| ParentView_SwitchLoading | UC-3 AC-3.1 | After clicking tab[1]: skeleton visible; aria-selected updated to tab[1]; ChildSwitcher still present. |
| ParentView_MultiChild_Switch | UC-3 AC-3.3 | After fetch resolves for child1 (Nguyễn Thu Hà / 8B1): GradeBookTable shows child1's subjects and scores; tab[0] inactive; tab[1] active. |

Additionally recommended (not blocking, but covers error and locked paths):

| Story name (recommended) | Maps to | Purpose |
|---|---|---|
| ParentView_SwitchError | UC-4 AC-4.1 | Error state: ErrorBanner visible; retry button present; ChildSwitcher intact. |
| ParentView_LockedBanner | UC-5 AC-5.1 | Child0 active with ADMIN_APPROVAL: LockedBanner rendered; masked cells. |

---

## 7. Open Questions

**[OQ-001]** — INT-001: What is the authoritative source for the parent's child list?
Options: (a) JWT claim embedded in the access token, (b) REST endpoint GET /core/api/v1/parent/children, (c) profile field from GET /users/me.
Current default: mock-first via MockGradeBookRepository.getChildList() (decision 0014).
Owner: ba-lead / BE (core service team).
Impact: affects whether a separate getChildList() use case and TanStack Query key are needed, or whether childrenList is available synchronously from AuthUser session state. If (a), no async loading for the child list; the four-state loading model for UC-1/UC-2 simplifies. If (b), a separate query key ['gradeBook', 'children'] is needed and must have its own loading/error states.

**[OQ-002]** — What is the expected behavior and copy key when a parent has 0 enrolled children?
This state is theoretically possible if a parent account exists but no child associations are established. The current story packet does not specify an empty-child-list state. A dedicated empty state message may require a new i18n key (violating NFR-007 if outside existing keys) or could reuse gradeBook.empty. Confirm scope before implementation.
Owner: ba-lead (product decision).

**[OQ-003]** — Does the ChildSwitcher card appear ABOVE or BESIDE the GradeBookTable?
The design source (gradebook.jsx ViewerGradeBook ~line 454) shows a top-row layout with "child selector (parent) + term + summary card" placed horizontally to the LEFT of the table. At 320px this may need to reflow vertically. Confirm responsive stacking behavior (horizontal at >= N px, vertical column at < N px) and the breakpoint value.
Owner: uiux-lead (layout confirmation from DR-002 spec).

**[OQ-004]** — Should ArrowRight/ArrowLeft on ChildSwitcher also auto-activate the focused tab (like a "selection follows focus" ARIA pattern), or should they only move focus (requiring explicit Enter/Space to activate)?
Current spec (NFR-009, BR-009) says focus-only. However, the WAI-ARIA authoring practices note that for tablist patterns where content loads on activation, "selection follows focus" can be acceptable if loading is fast (e.g. cached). Confirm whether focus-only is the final decision, especially for the case where TanStack Query cache is warm.
Owner: ba-lead / uiux-lead (UX decision).
