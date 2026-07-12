# US-E20.2 — Use Cases & Acceptance Criteria (Parent Notification Consent Section)

Lane: normal. Actor: `parent` only. Extends the already-implemented Profile
screen (`src/features/user/presentation/profile/`, US-E08.5) — not a new
route. Source: `requirements.md`, `integration.md`, DR-014.

## 1. Use Case Scope Summary

6 use cases: section load (loading/N-children/empty), error+retry (section-
scoped), toggle-on, toggle-off, toggle-save-failure (revert+error), and the
role-gate/mount-point behavior on the shared Profile route. Boundary: this
section only reads/writes the authenticated parent's OWN consent records; it
never creates/edits/removes links (US-E20.1, admin-only) and never shows
another parent's data.

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities |
| --- | --- | --- |
| `parent` | Primary, human | View own linked children, view/toggle 3 consent categories per child, read privacy footnote |
| `teacher` / `principal` / `student` / `admin` | Secondary, negative | MUST never render or receive this section's data on the shared Profile route |
| `core` service (mock-first) | System | Linked-students + consents backing store |

## 3. Use Case Catalogue

### UC-001: Load consent section with linked children

- **Primary actor:** parent. **Preconditions:** authenticated with role `parent`.
- **Main success scenario:**
  1. Parent navigates to their Profile screen.
  2. `ParentConsentSection` mounts in the identity column, below `AccountRequestsCard`.
  3. Section-local skeleton renders while INT-001 (linked-students) + INT-002 (consents) resolve; rest of Profile (tabs) is already interactive.
  4. Data resolves; one child-card renders per linked student, each with identity (avatar+name), "Đã liên kết" badge, and 3 toggles reflecting last-saved consent values.
- **Alternative flows:**
  - A1 — Consents resolve slightly after linked-students → toggles render disabled/skeleton (not a guessed default-on/off) until consent data arrives.
- **Exception flows:**
  - E1 — INT-001 or INT-002 fails (network/5xx) → section-scoped error (UC-003), rest of Profile page (personal/security/sessions tabs) remains usable.
  - E2 — INT-001 returns 403 due to a server-side memberId-scoping failure → treated as a hard error, NOT rendered as the empty state (must not look like "0 linked children").
- **Business rules:** all data scoped server-side to the authenticated parent's own resolved memberId (FR-004/NFR-007) — never a client-supplied id.
- **Non-functional constraints:** NFR-005 (section-local skeleton, doesn't block rest of Profile), NFR-006 (own `parentLinks.consentSection.*` namespace).

### UC-002: Empty state (zero linked children)

- **Primary actor:** parent with no linked students.
- **Main success scenario:**
  1. INT-001 resolves with `students: []`.
  2. Section shows empty state: "Chưa có con nào được liên kết" + guidance to contact the school.
- **Exception flows:** none beyond UC-001's E1/E2 (a genuine empty result is not an error).
- **Business rules:** this state must only render on a confirmed `200` with an empty array, never conflated with the 403 scoping-failure case (E2 above), which is a hard error instead.

### UC-003: Error state (section-scoped, retry)

- **Primary actor:** parent. **Preconditions:** INT-001 or INT-002 fails.
- **Main success scenario:**
  1. Section shows its own error UI ("Không tải được dữ liệu" + retry) confined to the section's mount point.
  2. Parent clicks retry; the failed fetch(es) re-issue.
  3. On success, section renders normally (UC-001 or UC-002 depending on result).
- **Business rules:** the rest of Profile (personal/security/sessions tabs) must remain fully interactive while the section shows its error — a section failure never blocks or crashes the page.

### UC-004: Toggle a consent on

- **Primary actor:** parent. **Preconditions:** section loaded successfully with >=1 child, toggle currently off.
- **Main success scenario:**
  1. Parent flips a toggle (e.g. "Thông báo điểm số") to on for a specific child — no confirm modal.
  2. Toggle shows a brief pending/disabled state; INT-003 PUT fires (optimistic-with-rollback).
  3. On success: toggle stays on, reconciled to the server-echoed value; success toast "Đã cập nhật quyền nhận thông báo" shows.
- **Exception flows:**
  - E1 — Save fails (see UC-006) → toggle reverts.
- **Business rules:** exactly one (studentId, category) pair mutates per interaction — flipping one toggle never affects another category or another child.

### UC-005: Toggle a consent off

- Same shape as UC-004, mirrored (on → off). Main success scenario ends with the toggle reflecting off, reconciled to server value, same success toast copy (the toast text does not differentiate on vs off — FR-003 specifies one toast message for any successful toggle change).

### UC-006: Toggle-save failure (revert + error)

- **Primary actor:** parent. **Preconditions:** a toggle interaction (UC-004 or UC-005) is in flight.
- **Main success scenario (failure path, this UC's "success" = correct failure handling):**
  1. Parent flips a toggle; optimistic UI shows the new state momentarily with a pending indicator.
  2. INT-003 PUT fails (422 VALIDATION_ERROR, 403, or network/5xx).
  3. Toggle reverts to its prior last-confirmed value (never left showing the attempted-but-unpersisted state).
  4. An error indication is shown (toast or inline) distinct from the success toast copy.
- **Business rules:** the UI must never display a toggle state that was not actually persisted server-side — revert is mandatory, not optional, on any failure code.
- **Non-functional constraint:** per open question resolution (see §6), revert + toast is treated as sufficient; no additional dedicated retry-button affordance is required beyond re-flipping the toggle again.

### UC-007: Role-gate + mount-point (shared Profile route)

- **Primary actor:** any authenticated actor on `(app)/(shared)/profile`.
- **Main success scenario:**
  1. An actor with role `parent` loads Profile → `ProfileScreenVM.parentConsent` is populated server-side → `ParentConsentSection` renders in the identity column, below `AccountRequestsCard`.
  2. An actor with role `teacher`/`principal`/`student`/`admin` loads the same shared route → `ProfileScreenVM.parentConsent` is `undefined`/absent (never populated) → the section does not render at all, and no linked-children/consent payload is ever sent to that client.
- **Business rules:** the gate must be server-driven (the ViewModel simply doesn't populate `parentConsent` for non-parent roles) — not a client-side `if (role === 'parent')` that still received the data over the wire and merely hid it.

## 4. Acceptance Criteria

```
UC-001: Load consent section with linked children
  AC-001.1 Loading — Given a parent navigates to Profile, When the section's data (INT-001+INT-002) has not yet resolved, Then a section-local skeleton renders in the identity column within one paint frame, while the rest of Profile (personal/security/sessions tabs) is already interactive.
  AC-001.2 Success — Given INT-001+INT-002 resolve with >=1 linked student, Then one child-card renders per student, each showing avatar+name, an "Đã liên kết" badge, and exactly 3 toggles (discipline/conduct, absence, grades) each with a 1-line muted description, reflecting last-saved values.
  AC-001.3 Toggles-pending sub-state — Given linked-students (INT-001) resolves before consents (INT-002), Then toggles render in a disabled/skeleton state (not a guessed on/off) until INT-002 resolves — never showing an unconfirmed state as persisted.
  AC-001.4 Privacy footnote — Given the section renders with >=1 linked child, Then the privacy footnote is visible: vi "Nhà trường chỉ gửi thông báo khi bạn đồng ý, và chỉ về những học sinh đã được liên kết với tài khoản của bạn. Bạn có thể thay đổi lựa chọn bất cứ lúc nào — việc tắt thông báo không ảnh hưởng đến quyền xem dữ liệu của con trong ứng dụng." / en mirror.
  AC-001.5 Mount point — Given the parent's Profile screen renders, Then `ParentConsentSection` mounts in the identity column, positioned below `AccountRequestsCard` (not as a 4th tab alongside personal/security/sessions).
```

```
UC-002: Empty state
  AC-002.1 Empty — Given INT-001 resolves with `students: []` (a genuine 200, not a 403), Then the section shows "Chưa có con nào được liên kết" + guidance to contact the school for linking, in place of any child-cards.
  AC-002.2 Distinguish from auth failure — Given INT-001 instead returns a 403 due to server-side memberId-scoping rejection, Then this MUST render as the error state (UC-003), never silently as the empty state of AC-002.1 — the two must be visibly and logically distinct paths.
```

```
UC-003: Error state (section-scoped)
  AC-003.1 Error render — Given INT-001 or INT-002 fails (network/5xx/timeout, or the 403-scoping-failure case), When the fetch settles, Then the section shows "Không tải được dữ liệu" + a retry action, confined to the section's mount point.
  AC-003.2 Rest of Profile unaffected — Given the section is showing its error state, Then the personal/security/sessions tabs remain fully rendered and interactive (switching tabs, editing personal info, etc. all still work).
  AC-003.3 Retry — Given the section is in its error state, When the parent activates retry, Then the failed fetch(es) re-issue and the section transitions to loading (AC-001.1), then to success (AC-001.2) or empty (AC-002.1) based on the new result.
```

```
UC-004: Toggle a consent on
  AC-004.1 Happy path — Given a child's "Thông báo điểm số" toggle is off, When the parent activates it, Then no confirm dialog appears, the toggle shows a brief pending state, INT-003 PUT fires with {studentId, category:"grades", enabled:true}, and on success the toggle stays on (reconciled to the server-echoed value) with toast "Đã cập nhật quyền nhận thông báo".
  AC-004.2 Single-scope mutation — Given the parent toggles one category for one child, Then only that (studentId, category) pair changes — no other toggle for that child or any other child changes state.
  AC-004.3 Keyboard operability — Given the parent uses only a keyboard, When they tab to a toggle and press Space/Enter, Then the toggle activates identically to a pointer click, with role=switch and aria-checked updating accordingly (NFR-002).
```

```
UC-005: Toggle a consent off
  AC-005.1 Happy path — Given a child's toggle is on, When the parent deactivates it, Then the same flow as AC-004.1 applies (no confirm dialog, pending state, INT-003 PUT with enabled:false), ending in the toggle off + the identical success toast copy "Đã cập nhật quyền nhận thông báo" (toast text is the same regardless of on/off direction, per FR-003).
```

```
UC-006: Toggle-save failure (revert + error)
  AC-006.1 Revert on failure — Given a parent flips a toggle, When INT-003 fails (422/403/network/5xx, any code), Then the toggle reverts to its prior last-confirmed value — it must never remain showing the attempted-but-failed state.
  AC-006.2 Error surfaced — Given AC-006.1's revert occurs, Then an error indication is shown (toast or inline, distinct wording from the success toast) so the parent is aware the change did not persist.
  AC-006.3 No dedicated retry button required — Given a toggle save fails and reverts, Then the parent can retry simply by flipping the toggle again (re-triggering the same flow) — a separate dedicated "retry" affordance is not required for this interaction (resolves the open question from requirements.md/integration.md).
  AC-006.4 No false-persisted state — Given any toggle interaction (success or failure), Then at no point does the UI display an on/off state that has not been confirmed by the server's response — pending states must be visually distinguishable from confirmed states (e.g. via the pending/disabled treatment in AC-001.3/loading pattern).
```

```
UC-007: Role-gate + mount point
  AC-007.1 Parent sees section — Given an authenticated actor with role `parent` loads /profile, Then `ParentConsentSection` renders with their own data (per UC-001/002/003).
  AC-007.2 Non-parent never sees section — Given an authenticated actor with role `teacher`, `principal`, `student`, or `admin` loads the same shared /profile route, Then `ParentConsentSection` does not render at all, AND `ProfileScreenVM` does not include a populated `parentConsent` field for that session (server-side omission, not a client-side hide of already-fetched data).
  AC-007.3 Own-data-only scoping — Given a parent actor's session, When INT-001/INT-002/INT-003 are called, Then the server resolves the acting parent's memberId from the authenticated session (Bearer token) — a parent cannot view or mutate another parent's linked-children/consent data by any client-supplied identifier.
  AC-007.4 i18n namespace boundary — Given any consent-section copy (title, toggle labels/descriptions, toast, privacy footnote, empty/error text), Then it is sourced from `parentLinks.consentSection.*` (both vi.json and en.json), and NONE of this copy is duplicated into the `profile.*` namespace — verified by `tsc --noEmit` passing with the extended `ProfileScreenVM` type and by grepping `profile.*` keys for absence of consent-section strings.
```

## 5. Edge Case Matrix

| Feature | Empty | Max-length | Concurrent action | Auth-expired | Network-error | Wrong-role |
| --- | --- | --- | --- | --- | --- | --- |
| Section load (UC-001) | UC-002 (0 children) | Long child name wraps within card, no truncation needed (single name, short field) | Admin unlinks this parent's link to a child while Profile is open (US-E20.1 concurrently) → next Profile load/refetch simply omits that child, no crash; in-session (already-rendered) card is not required to live-update mid-session | Reactive refresh (decision 0018) attempts once; on failure, standard cross-screen redirect-to-login, not section-specific | AC-003.1 | AC-007.2 |
| Toggle on/off (UC-004/005) | N/A (toggles only exist when children exist) | N/A | Parent rapidly double-flips the same toggle before the first PUT resolves → per-toggle PUT (not full-object) avoids cross-toggle race per integration.md's recommendation; last user action should win, no lost update to a DIFFERENT category | Token expiry mid-toggle → reactive refresh transparently retries once; if it still fails, treated as a network/save failure → UC-006 revert path | Treated identically to any other INT-003 failure → UC-006 | N/A (mutation is own-data-only, gated by UC-007.3) |
| Toggle failure (UC-006) | N/A | N/A | Two failure sources overlapping (e.g. token expiry AND validation error) → still resolves to the single revert+error UI behavior, no special-cased double-error UI needed | Same as above | AC-006.1/.2 | Same as UC-004/005 row |
| Role-gate (UC-007) | N/A | N/A | N/A | Non-parent actor with an expiring token → standard redirect-to-login applies before role-check even matters | N/A (route/VM-level, not a fetch) | AC-007.2 (explicit) |

## 6. Open Questions

- Resolved for AC purposes (per requirements.md's explicit hand-off to this modeling step): **revert + toast is sufficient** on toggle-save failure; no dedicated retry-button affordance required (AC-006.3). Flag to `ba-lead` if product later wants a stronger recovery affordance.
- `[OPEN QUESTION]` (carried) Does `PUT /parent-student-links/consents` take one category at a time or a full per-child object? AC-004.1/AC-005.1 are written against the per-toggle recommendation from integration.md; if `core` ships a full-object PUT instead, the AC's request-shape assertion (not its user-facing behavior) would need updating.
- `[OPEN QUESTION]` (carried) Should INT-002 (consents) be inlined into INT-001 (linked-students) by `core`, or remain a separate call? Not blocking for AC — AC-001.3 already covers the case where they resolve at different times regardless of whether that's two HTTP calls or two phases of one response.
- `[OPEN QUESTION]` Exact error code(s) for a consent-update failure — unresolved until `core`'s `ERROR_CODES.md` exists; AC-006.1 is written to cover "any error code" mapping to the same revert+error behavior, so this should not block implementation.
- `[OPEN QUESTION]` Whether `core` should return `meta.pagination` on the linked-students list for consistency with other list endpoints (unlikely to matter given small counts) — no AC written against pagination for this story; flag if a parent with many linked children becomes a real scenario.
