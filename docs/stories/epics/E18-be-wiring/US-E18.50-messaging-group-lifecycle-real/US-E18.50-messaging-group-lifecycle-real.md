# US-E18.50 Messaging group room lifecycle real (BE US-193, ADR 0132)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/messaging/` (group lifecycle slice only)
- Shared contract/file: `HybridMessagingRepository`, `IMessagingRepository`

## Ground truth (fe-lead, verified against local `edu-api` checkout, US-193, ADR 0132)

`edu-api/services/social/docs/openapi.yaml`:

- **`POST /api/v1/rooms/groups`** (201) — creates a `SCHOOL`-scope, `custom`-type
  ad-hoc group room, seeding the caller as OWNER in the same request. Body:
  `{name}` ONLY (`minLength:1, maxLength:255`) — **no `description`, no `kind`,
  no `color`, no `memberIds`**. Creator/tenant resolved server-side from the
  verified Gateway claims — never accepted in the body.
  - **Role allow-list, deny-by-default**: caller's IAM role must be `ADMIN`,
    `MANAGER`, `TEACHER`, or `STAFF`. `STUDENT`/`PARENT`/unrecognized →
    `403 SOCIAL_GROUP_ROOM_CREATION_FORBIDDEN`. Gate the "create group" UI
    affordance by role, don't just let the 403 surface as a generic error.
  - Response (`CreateGroupRoomResponse`): `{roomId, scope:"SCHOOL",
    tenantId, roomType:"custom", name, status:"active", createdAt}`.
    **Does NOT echo membership** — no member list, no "you are OWNER" object.
    If the UI needs to show the creator as a member immediately, that's a
    CLIENT-SIDE inference (you already know who the caller is), not a
    server-confirmed fact until the next `getGroup`/room-detail read.
  - To add further members: reuse the EXISTING `POST /rooms/{roomId}/members`
    endpoint (ground-truth this constant already exists somewhere in
    `messaging.endpoint.ts` or is a genuinely new one — check). No batch-add
    endpoint exists — this is explicitly a 2-call flow (create room, then add
    each member, or add-members-in-a-loop if the existing endpoint accepts
    one id at a time — check its real signature before assuming batch).
- **`POST /api/v1/rooms/{roomId}/archive`** (204) — soft-archives a `custom`-type
  group room. Requires `delete_room` capability (OWNER-only per the EXISTING
  ADR 0065 capability matrix — no new capability, reuse whatever capability-
  check mechanism the real repository already has for other room actions).
  **Idempotent**: archiving an already-archived room still returns 204, not
  an error. **Scoped to `custom` rooms only**: archiving `class_chat`/
  `parent_group` (system-provisioned) → `409 SOCIAL_ROOM_NOT_SELF_SERVICE`.
  Archived rooms keep history but reject new sends (`409 ROOM_ARCHIVED`,
  reuses an EXISTING guard — not new to this story).

## Current state (read before touching anything)

`src/features/messaging/domain/repositories/i-messaging.repository.ts` — the
group-lifecycle methods (`createGroup`, `getGroup`, `updateGroup`,
`addGroupMembers`, `removeGroupMember`, `leaveGroup`, `deleteGroup`) are ALL
routed to mock via `HybridMessagingRepository` (US-E18.17/ADR 0060 — "no
self-service group-room contract exists, only system-provisioned
`class_chat`/`parent_group`"). That premise is now PARTIALLY false: create +
archive (mapped to `deleteGroup`? — check which mock method name the UI's
"delete/leave group" affordance actually calls, since the real contract only
has "archive", not "delete" — you may need to rename the domain method or
just implement `deleteGroup` as a thin wrapper over the real `archive` call,
whichever keeps the smallest diff) now have a real contract. **`updateGroup`,
`addGroupMembers` (batch — the real add-member endpoint is presumably single-
id, confirm), `removeGroupMember`, `leaveGroup` have NO ground-truthed real
contract from this batch** — do not assume they're now real just because
create/archive are; re-verify each against openapi before touching, and if
no real contract exists, LEAVE that specific method mock-routed (this is a
PARTIAL un-mock, same class as US-E18.31/US-E18.32 in this epic — a hybrid
that's real for SOME methods, not "the whole feature is now real").

`CreateGroupInput` (`{name, description?, kind, color, memberIds}`) is a
mock-era invented shape with 4 fields the real contract doesn't have at all
— fix the TYPE, not just the implementation, so a caller can't even attempt
to pass `description`/`kind`/`color`/`memberIds` to the real path. Decide
whether `CreateGroupInput` narrows to `{name}` for the real path with a
separate mock-only richer type, or whether the domain-level type narrows
globally (check how many mock-only UI affordances read `description`/`kind`/
`color` today — if the group-creation FORM currently collects those fields,
you'll need to either remove them from the form for real mode or keep them
mock-only-collected-but-never-sent, document whichever you choose).

## Scope

1. Ground-truth EACH of the 7 group-lifecycle methods individually against
   `edu-api/services/social/docs/openapi.yaml` — do not assume "US-193 shipped
   group rooms" means all 7 are now real. Only `createGroup`(→`POST /rooms/groups`)
   and whatever maps to `archive` are confirmed real by this batch.
2. Wire the confirmed-real methods into `MessagingRepository` (the real
   class), update `HybridMessagingRepository` to route ONLY those to `real`,
   keep the rest routed to `mock` with an updated, accurate doc-comment (the
   current one claims zero self-service capability exists — no longer true).
3. Fix `CreateGroupInput`/`CreateGroupRoomRequest` DTO to match the real
   `{name}`-only body; map the 201 response (no membership echo) to
   `GroupEntity` — decide what a freshly-created group's member list should
   show client-side (probably just the caller, until a re-fetch) and document
   the inference vs. server-confirmed distinction in a comment.
4. Role-gate the "create group" UI entry point: hide/disable for STUDENT/PARENT
   appRole (client-side UX) AND keep the 403 mapped to a clear failure for
   defense-in-depth (server can still reject even if UI somehow allows it).
5. Wire archive with its idempotent-204 and `409 SOCIAL_ROOM_NOT_SELF_SERVICE`
   (map to a distinct failure — "this isn't a group you created, can't
   archive" — not a generic error) and `409 ROOM_ARCHIVED` (if reachable from
   this path) behaviors.
6. Error-code mapping: branch on `error.code` (UPPER_SNAKE per `social`),
   never message.

## NOT in scope

- Any group-lifecycle method NOT confirmed real by this ground-truth pass —
  stays mock, document why in the hybrid facade's comment.
- `getContacts()` — separate story (US-E18.52).
- Message pin/unpin — separate story (US-E18.51).

## Acceptance Criteria

- Real mode: a TEACHER/STAFF/ADMIN/MANAGER can create a group room (`{name}`
  only) and it appears real (not mock data) on next read.
- Real mode: a STUDENT/PARENT cannot create a group room — UI hides the
  affordance; a forced attempt maps to a clear forbidden failure.
- Real mode: the OWNER can archive a `custom` room (idempotent); attempting
  to archive `class_chat`/`parent_group` maps to a clear "not self-service"
  failure, not a generic error.
- Whichever group-lifecycle methods are NOT confirmed real stay mock,
  correctly documented.
- `USE_MOCK=true` unchanged.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | repository test (exact body `{name}` only, 201 mapping, archive idempotency, 409 mapping), DI/hybrid routing test |
| Integration | real interceptor pipeline test |
| E2E | Storybook interaction — create-group role-gated, archive flow, forbidden states |
| Platform | `bun vitest run` zero-regression, `bun run build` mock+real |
| Release | merged to main, branch deleted |

## Harness Delta

- TEST_MATRIX row for group lifecycle real-mode.
- Close ask #32(a) in the FE→BE report (partial — only for confirmed-real methods).
- EPIC-OVERVIEW.md Wave 8 row.

## Evidence

### Per-method ground-truth verdict (the AC of this story)

Each method was checked against `edu-api/services/social/docs/openapi.yaml`
**and** the Go handlers/use-cases (`internal/room/adapter/http/room_handler.go`,
`routes.go`, `core/application/usecase/remove_room_member.go`) — the spec alone
is not trusted (US-E18 precedent: openapi can drift from the running server).

| # | Method | Verdict | Endpoint / why not |
| - | ------ | ------- | ------------------ |
| 1 | `createGroup` | **REAL** | `POST /api/v1/rooms/groups` (201). Body `{name}` only — confirmed in `dto/room_request.go` ("The Room entity has no description field"). Creator + tenant from verified claims. Role allow-list ADMIN/MANAGER/TEACHER/STAFF → 403 `SOCIAL_GROUP_ROOM_CREATION_FORBIDDEN`. |
| 2 | `deleteGroup` | **REAL** (as archive) | `POST /api/v1/rooms/{roomId}/archive` (204, idempotent). Domain method deliberately NOT renamed — the UI affordance + `boolean` Result are unchanged, so this is the smallest honest diff. 409 `SOCIAL_ROOM_NOT_SELF_SERVICE`, 403 `SOCIAL_INSUFFICIENT_ROOM_PERMISSION` (OWNER-only `delete_room`, ADR 0065). |
| 3 | `getGroup` | still MOCK | `GET /rooms/{roomId}` (RoomDetail) + `GET /rooms/{roomId}/members` exist, but `RoomMember` carries `userId`/`roomRole`/`joinedAt` — **no display name**, and `GroupEntity.members[]` needs name+initials+colour. A real `getGroup` = 3-call fan-out (detail + members + `GET /social/rooms/{id}/members/directory`) **plus** `description`/`kind`/`color` that exist on no room endpoint ⇒ an entity reshape. Separate story, not a repo swap. |
| 4 | `updateGroup` | still MOCK | There is **no `PATCH`/`PUT /api/v1/rooms/{roomId}`** at all (`routes.go` has only `GET /:roomId` and `POST /:roomId/archive`). A room's name is not editable through the public contract. |
| 5 | `addGroupMembers` | still MOCK | `POST /rooms/{roomId}/members` exists (single `userId`, idempotent — **no batch-add**, ADR 0132 §Alternatives-2), but the method returns a full `GroupEntity` → same blocker as #3. Wiring only the write half would leave the read half mock ⇒ a fake-success surface (the US-E18.31 lesson). |
| 6 | `removeGroupMember` | still MOCK | `DELETE /rooms/{roomId}/members/{userId}` exists (204), same `GroupEntity` return blocker as #3/#5. |
| 7 | `leaveGroup` | still MOCK — **deliberate, flagged** | A real self-leave path DOES exist: `DELETE /rooms/{roomId}/members/{self}` bypasses the `remove_member` capability for actor==target (ADR 0094, verified in `remove_room_member.go`), and the `boolean` Result shape would fit with no reshape. NOT wired because (a) unlike archive it is **not scoped to `custom` rooms** — a member could leave a system-provisioned `class_chat`/`parent_group` with no re-provisioning contract, and (b) the retained last-OWNER guard means every self-service creator (always the sole OWNER) gets an error that needs its own failure + copy. Raised to `fe-lead` as a follow-up story rather than silently enabled. |

So: **2 real, 5 mock.** "BE US-193 shipped group rooms" ≠ "the group slice is
now real" — the split is asserted method-by-method in
`hybrid-messaging.repository.test.ts` and documented in the facade's doc-comment
table + next to each stub in `MessagingRepository`.

### Type fix (not just implementation)

`CreateGroupInput` narrowed from `{name, description?, kind, color, memberIds}`
to `{name}`. The four extra fields never existed on any wire — they were
mock-era invention. Because a caller can no longer pass them, the two-step
create form collapsed to a **single name-only step**: the description textarea,
the 4-way kind picker, the 8-swatch colour palette and the member picker are
gone (`color-swatches.ts` deleted; 16 now-dead `messaging.group.*` i18n keys
pruned from vi+en). This was chosen over "collect but never send" precisely
because the latter is a UI that lies. The group avatar tone is now derived from
the room id with the same `roomColorKey` rotation the conversation list already
uses, in **both** the real mapper and the mock, so groups still look
distinguishable without inventing a persisted colour.

`toGroupEntityFromCreatedRoom` maps the 201 with `members: []` on purpose: the
contract seeds the caller as OWNER but echoes **no membership and no display
name**, so a synthesized member row would be fiction wearing a server fact's
clothes. The "creator is a member" inference lives at the call site instead
(`memberCount: Math.max(created.members.length, 1)`, commented as an inference
from the contract) and is replaced by the next room read.

### Role gate (both halves)

`getSessionRole()` → `canCreateGroupFor()` (fail-closed on `null`) in the RSC
page → `canCreateGroup` prop → the `onCreateGroup` handler is simply **absent**
for STUDENT/PARENT, so neither the inline CTA nor the empty-state button
renders, and the modal is not mounted. Defense-in-depth is the other half: the
repository still maps 403 `SOCIAL_GROUP_ROOM_CREATION_FORBIDDEN` to the distinct
`create-group-forbidden` failure, whose copy says "not permitted" rather than
"try again".

### Known asymmetry (deliberate, documented)

In real mode a group you CREATE is real and a group you ARCHIVE is really
archived, but the group **info panel** (members, rename, add/remove member,
leave) is still mock-backed. This is recorded in the hybrid facade's table so
nobody reads the feature as fully wired.

### Proof

- Unit/integration: `bunx vitest run` → **499 files / 3883 tests pass** (zero
  regressions). New/updated: `messaging.repository.test.ts` (39),
  `hybrid-messaging.repository.test.ts` (3), `group.mapper.test.ts` (4),
  `create-group.use-case.test.ts` (6), `group-creation-gate.test.ts` (9),
  `messaging.mock.repository.test.ts` (updated to the narrowed input).
- Storybook interaction: `bunx vitest run --config vitest.storybook.mts` →
  **157 files / 1238 tests pass**, including the new
  `CreateGroup_Hidden_ForStudentOrParent`, `ArchiveGroup_NotSelfService_Error`,
  `NameOnly_NoDroppedFields`, `SubmitError_Forbidden`.
- `bunx tsc --noEmit` clean; `bun lint` clean (only the two pre-existing
  warnings elsewhere in the repo).
- `bun run build` green in mock mode AND with `NEXT_PUBLIC_USE_MOCK=false`.
- `USE_MOCK=true` behaviour unchanged apart from the intentional name-only
  create form.

## Accessibility Audit (fe-accessibility-auditor, WCAG 2.1 AA — decision `0013`)

**Verdict: PASS.** No Blocking/Critical/Major findings. Two Minor notes below
(non-blocking; recorded so they don't get re-litigated).

### 1. Storybook interaction suite re-run (scoped)

Re-ran independently rather than trusting the engineer's report:

- `bun vitest run --config vitest.storybook.mts create-group-modal` →
  **1 file / 8 tests pass** (`Empty`, `NameOnly_NoDroppedFields`,
  `Valid_SubmitsNameOnly`, `ValidationError`, `Submitting`,
  `SubmitError_Generic`, `SubmitError_Forbidden`, `Mobile_375`).
- `bun vitest run --config vitest.storybook.mts messaging-screen` →
  **2 files / 30 tests pass**, including `CreateGroup_Hidden_ForStudentOrParent`
  and `ArchiveGroup_NotSelfService_Error`.

### 2. Simplified name-only form (`create-group-modal.tsx`)

- Label: `<label htmlFor={nameId}>` (l.118-123) correctly bound to the `<input
  id={nameId}>` (l.124-137) — WCAG 1.3.1/4.1.2 satisfied.
- Error state: on invalid name, `aria-invalid="true"` + `aria-describedby={errId}`
  wired to the visible `<p id={errId}>{t("nameTooShort")}</p>` (l.134-142) — WCAG
  3.3.1/4.1.3. Error text uses `text-edu-error-text` (not color-only) and the
  message is actionable ("Tên nhóm cần ít nhất 2 ký tự.").
- Focus trap/restore: `create-group-modal.tsx` uses the shared `Dialog` primitive
  (`src/components/ui/dialog/dialog.tsx`), which already wires
  `useDialogReturnFocus` on `onCloseAutoFocus` (repo-wide precedent, DEF-01/
  US-E22.1) — no custom override here, so trap + return-focus are inherited
  correctly. Radix `DialogTitle`/`DialogDescription` are used as-is (l.85-90),
  so the dialog's `aria-labelledby`/`aria-describedby` stay intact — WCAG 2.4.3,
  4.1.2.
- Keyboard: single tab stop (name input) → Cancel → Create; `Enter` in the input
  submits directly (l.130-132) without requiring a tab to the button — no
  regression from the prior multi-step flow, arguably simpler now. `Escape`
  closes via Radix default (resets local `name`/`nameTouched` state, l.67-73).

### 3. Role-gated create-group entry point

- Server-derived: `app/[locale]/t/[tenant]/(app)/(shared)/messages/page.tsx`
  computes `canCreateGroupFor(sessionRole)` (fail-closed on `null`/unknown role,
  `group-creation-gate.ts` l.16-18) in the RSC and passes it down as
  `canCreateGroup` — not a client-only check.
  `conversation-list.tsx` only renders the "Tạo nhóm" CTA (inline + empty-state)
  when `onCreateGroup` is **present** (l.151, l.186) — for STUDENT/PARENT the
  handler is `undefined` (`messaging-screen.tsx` l.523-525), so the button is
  **fully absent from the DOM**, not `disabled` with no explanation. This is the
  correct pattern per WCAG 2.4.3/ARIA APG guidance (a disabled-but-visible button
  with no accessible reason text is worse than a hidden affordance) — confirmed
  by `CreateGroup_Hidden_ForStudentOrParent` asserting `queryByRole("button", {
  name: /tạo nhóm/i })` is `not.toBeInTheDocument()`.
- No explanatory copy exists for why STUDENT/PARENT don't see the CTA. Judgment:
  **acceptable, not a finding.** Other role-gated affordances in this app (e.g.
  admin-only sidebar links) follow the same fully-absent-no-copy pattern, and a
  messaging surface where students/parents never had a "create group" mental
  model to begin with doesn't create the "where did my button go" dead-end that
  a *removed* feature would. Defense-in-depth (403 → `create-group-forbidden`,
  distinct forbidden copy) covers the one case where a stale client renders the
  CTA anyway.

### 4. Archive / `group-not-self-service` error state

- Announced via `role="alert"` (`conversation-list.tsx`, dismissible banner) —
  not color-only; text content is the specific, actionable copy: vi
  `"Đây là nhóm do hệ thống tạo (lớp học, hội phụ huynh) nên không thể lưu trữ."`
  / en `"This is a system-managed group (class or parent group) and cannot be
  archived."` (`messages/{vi,en}.json`) — explains *why* and implicitly *that
  retrying won't help*, satisfying the "error messages say how to fix" baseline
  better than a generic "action failed" would (no literal fix action exists, but
  the reason removes the urge to retry). WCAG 3.3.1/4.1.3.
- Dismiss control has `aria-label={tCommon("close")}` (icon-only `<X>` button,
  `aria-hidden` on the icon itself) — WCAG 1.1.1/4.1.2 for icon-only controls.
- `ArchiveGroup_NotSelfService_Error` story confirms end-to-end: opens group
  info panel (Radix `dialog` role, named), clicks delete, confirms, then asserts
  `canvas.getByRole("alert")` has text matching `/nhóm do hệ thống tạo/i` — SR
  users get the same explanation sighted users see.

### 5. Contrast (resolved against `src/app/tokens.css`, not eyeballed)

- `text-edu-error-text` (`#c0392b`) on `bg-edu-error-light` (`#fff5f2`) →
  **≈5.08:1**, passes 4.5:1 for normal `text-sm` body text (both the submit-error
  banner in the modal and the archive-error banner in `conversation-list.tsx`
  reuse this exact pattern, matching ADR 0049's canonical error-text token
  choice — `text-destructive` was correctly avoided).
- No white-on-warning found in the diff (this story touches error, not warning,
  tokens).
- No raw color introduced — `create-group-modal.tsx` uses only
  `bg-primary`/`text-primary-foreground`/`border-border`/`text-muted-foreground`/
  `text-edu-error-text`/`bg-edu-error-light`/`border-edu-error/30`, all
  pre-existing semantic tokens.

### 6. Deleted color-swatch picker — no orphaned debt

- `color-swatches.ts` (41 lines) is fully deleted in this commit (`git show
  c49a270e --stat`), not left dangling.
- Grep for `swatch`/`colorSwatch` in `src/features/messaging` after the change
  turns up only two doc-comments (`group.entity.ts` l.5/39,
  `create-group-modal.tsx` l.39) describing the *removed* palette for context —
  no orphaned CSS classes, no dead i18n keys referencing swatch colors (the 16
  dead `messaging.group.*` keys were pruned per the story's own Evidence
  section, verified present in `vi.json`/`en.json` diff).
- The decorative avatar preview (`avatarToneClasses("primary")` →
  `bg-edu-primary/15 text-edu-primary`, l.106-114) is `aria-hidden="true"` and
  reuses an existing, already-audited avatar-tone pattern shared with the
  conversation list — not new contrast debt from this story.

### Quick wins (optional, non-blocking)

- None required. If closing the loop on Minor items: consider a follow-up note
  in the packet (not a code change) that `leaveGroup`'s still-mock status
  (Evidence §7) means a self-service creator who leaves their own group sees no
  real-mode last-OWNER guard yet — purely a functional/BE-wiring note, not an
  a11y finding, flagging only because a future real-mode `leaveGroup` will need
  the same "distinct failure, not generic error" treatment this story applied
  to archive.
