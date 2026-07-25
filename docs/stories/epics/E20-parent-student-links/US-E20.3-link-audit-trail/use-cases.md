# US-E20.3 — Parent–Student Link Audit Trail — Use Cases & Acceptance Criteria

Actors: `admin`, `principal` (identical to the existing `PLDetailDialog` role
gate, US-E20.1 — no new gate introduced). All UI states required per
`.claude/rules/accessibility.md` + hard 4-states rule.

## UC-101 — View the link's audit trail (loading / empty / error / success)

**Goal:** admin/principal sees the Create/Unlink history for the currently
open link, without the rest of the dialog being affected by this
sub-section's own fetch lifecycle.

### AC-101.1 — Loading state, scoped skeleton

```gherkin
Given the admin has opened the detail dialog for a link
When PLAuditTrailSection mounts and its getLinkAuditTrail(linkId) query has not yet resolved
Then a 2-row skeleton is rendered inside the section's own mount point only
And the skeleton wrapper has aria-busy="true" and an sr-only loading label ("Đang tải lịch sử…")
And the rest of the dialog (student/parent/relationship/consent rows) renders normally, unaffected by this section's loading state
```

### AC-101.2 — Empty state, dominant and honest, no CTA

```gherkin
Given the link's audit trail resolves to zero entries (e.g. link "l3", seeded with no audit history)
When the section finishes loading
Then it shows the empty-state title "Chưa có lịch sử ghi nhận" and body explaining recording starts now
And no call-to-action button is rendered (read-only; nothing to do)
And the empty state is NOT visually styled as an error (no alert/error tone)
```

### AC-101.3 — Error state, scoped, retry-capable

```gherkin
Given the getLinkAuditTrail(linkId) query rejects with a network-error failure
When the section attempts to render
Then a role="alert" banner is shown with the error copy "Không tải được lịch sử liên kết. Vui lòng thử lại." and a visible "Thử lại" button
And the banner uses the same tokens as PLConsentDetailSection's error state (bg-edu-error/10, text-edu-error-text, AlertTriangle icon)
And the rest of the dialog remains fully usable (no whole-dialog error state is triggered)
When the admin activates the retry button
Then the section re-issues the getLinkAuditTrail(linkId) query and returns to its loading state
```

### AC-101.4 — Success state, reverse-chronological list

```gherkin
Given the link's audit trail resolves to entries for link "l6": [created(2025-10-02), unlinked(2025-10-20), created(2025-11-01, note="Tái tạo liên kết sau khi xác minh lại giấy tờ giám hộ.")]
When the section renders the success state
Then the entries are displayed newest-first: created(2025-11-01) with its note visible, unlinked(2025-10-20), created(2025-10-02)
And each row shows an icon+text action badge — "Đã tạo liên kết" (tone success) or "Đã gỡ liên kết" (tone error) — never conveyed by color alone
And each row shows the actor's display name and a short date/time derived from occurredAt
```

## UC-102 — Emission on successful Create (FR-107)

```gherkin
Given an admin, authenticated with role admin and tenant matching the mock tenant, submits the create-link form with student=st7, parent=pa2, relationship=father, note="Người giám hộ mới"
When CreateParentStudentLinkUseCase.execute(...) resolves ok
Then exactly one new LinkAuditEntry is recorded for the new link's linkId with action="created", note="Người giám hộ mới", actorId/actorName sourced from the acting admin's own AuthContext, and occurredAt from the repository's clock
And the entry appears at the top (newest) of that linkId's trail on the next getLinkAuditTrail(linkId) query
```

```gherkin
Given the same create submission targets a (studentId, parentId) pair that is already linked
When CreateParentStudentLinkUseCase.execute(...) resolves fail({ type: "already-linked" })
Then NO audit entry is recorded for any linkId (the failed attempt leaves no trace)
```

## UC-103 — Emission on successful Unlink (FR-107, HIGH-RISK mutation, US-E20.1 precedent)

```gherkin
Given an admin with role admin and tenantId matching the link's own tenant unlinks link "l1"
When UnlinkParentStudentLinkUseCase.execute("l1", authCtx) resolves ok
Then exactly one new LinkAuditEntry is recorded for linkId "l1" with action="unlinked", note=null, actorId/actorName from the acting admin's AuthContext
And this entry is retrievable via getLinkAuditTrail("l1") even though "l1" no longer appears in listLinks() results (FR-108 — trail independent of the active-links STORE)
```

```gherkin
Given an authCtx whose role is not "admin" (forged/altered role, mirroring US-E20.1's AC-005.5 proof) attempts to unlink link "l1"
When UnlinkParentStudentLinkUseCase.execute("l1", authCtx) resolves fail({ type: "forbidden" })
Then NO audit entry is recorded (the rejected mutation, HIGH-RISK enforcement, leaves no audit trace)
```

```gherkin
Given an authCtx with role admin but a tenantId different from the link's own tenant (cross-tenant forbidden, AC-005.5 precedent) attempts to unlink a link
When the mock repository rejects with fail({ type: "forbidden" })
Then NO audit entry is recorded
```

## UC-104 — Note appears only on 'created' entries (FR-103)

```gherkin
Given a link is created with note="Ghi chú tạo" and later unlinked by the same or a different admin
When the audit trail for that linkId is rendered
Then the "created" row shows the note "Ghi chú tạo" on its own muted line, prefixed by "Ghi chú"
And the "unlinked" row shows NO note line at all, regardless of any text passed anywhere in the unlink flow (the unlink confirm dialog has no note input to source one from)
```

```gherkin
Given a link is created WITHOUT a note (note left blank in the create form)
When the audit trail is rendered
Then the "created" row shows no note line (empty/undefined note never renders a blank "Ghi chú:" line)
```

## UC-105 — Reverse-chronological ordering invariant, including create→unlink→re-create (FR-102, INT-107)

```gherkin
Given link "l6" has the lifecycle: created (2025-10-02) -> unlinked (2025-10-20) -> re-created (2025-11-01, with a note)
When getLinkAuditTrail("l6") is queried
Then the returned array order is exactly [created(2025-11-01), unlinked(2025-10-20), created(2025-10-02)] — newest first
And this order holds by construction (each new entry is unshifted, never requiring a sort at read time)
```

```gherkin
Given a unit test injects a deterministic clock via __setMockAuditClock returning strictly increasing timestamps per call
When two mutations happen in sequence within the same test (e.g. create then unlink)
Then the resulting occurredAt values and array order are exactly predictable and assertable — no reliance on real wall-clock timing
```

## UC-106 — A11y states (NFR-101)

```gherkin
Given the audit trail section is in its loading state
When inspected with assistive technology
Then the loading wrapper has aria-busy="true" and contains an sr-only text node announcing "Đang tải lịch sử…"
```

```gherkin
Given the audit trail section is in its error state
When inspected with assistive technology
Then the error banner has role="alert" (announced immediately) and the retry button is reachable via keyboard (Tab) and activatable via Enter/Space
```

```gherkin
Given the audit trail section is in its success state with both a "created" and an "unlinked" entry visible
When the page is rendered in grayscale/without color perception
Then each entry's action is still distinguishable via its icon (link vs x) and its text label ("Đã tạo liên kết" vs "Đã gỡ liên kết") — never relying on color alone
```

## UC-107 — Append-only invariant (FR-109 — negative scope, explicitly no AC should ever exist for the following)

```gherkin
Given the audit trail section renders any entry, seeded or runtime-recorded
Then there is NO edit control, NO delete control, and NO API/use-case method that mutates or removes an existing LinkAuditEntry anywhere in this feature
And there is NO filter/search/date-range control anywhere in this section (explicit YAGNI, DR-023 decision 4)
```

## AC Coverage Summary

| UC | # AC scenarios | FR/NFR traced |
| --- | --- | --- |
| UC-101 | 4 (loading, empty, error+retry, success/ordering-in-row) | FR-101, FR-104, FR-105, FR-106, NFR-101 |
| UC-102 | 2 (success emission, failed-attempt no-emission) | FR-107 |
| UC-103 | 3 (success emission + trail-survives-unlink, forbidden role, forbidden cross-tenant) | FR-107, FR-108, NFR-103 |
| UC-104 | 2 (note on created, no note when blank) | FR-103 |
| UC-105 | 2 (ordering invariant, deterministic-clock test seam) | FR-102, NFR-102 |
| UC-106 | 3 (loading/error/color-independence a11y) | NFR-101 |
| UC-107 | 1 (negative — append-only, no filter) | FR-109 |
| **Total** | **17 scenarios across 7 use cases** | all Must-priority FRs + all NFRs covered |

No UNCOVERED functional requirement — FR-101 through FR-108 (all Must) each
map to at least one scenario above; FR-109 (Won't) is covered by an explicit
negative-scope scenario (UC-107) so `/fe`/QA never accidentally builds the
excluded surface.
