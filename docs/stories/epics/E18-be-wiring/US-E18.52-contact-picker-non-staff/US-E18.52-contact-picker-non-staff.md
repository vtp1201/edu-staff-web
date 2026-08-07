# US-E18.52 Contact picker non-staff via IAM narrowed tier (BE US-190, ADR 0129)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/messaging/` (`getContacts()` only), `src/features/iam-directory/` (widen, don't fork)
- Shared contract/file: `iam-directory`'s `SearchMembersUseCase`/`DirectoryMember` entity (reused everywhere else in this epic — this is its Nth widening)

## Ground truth (fe-lead, verified against local `edu-api` checkout, US-190, ADR 0129 amends 0120)

`edu-api/services/iam/docs/openapi.yaml`, `GET /api/v1/tenants/{id}/members`:

- **Staff tier** (SUPER_ADMIN platform role, or tenant ADMIN/MANAGER/TEACHER)
  — UNCHANGED, byte-identical to before. Browses the whole directory, full row.
- **Narrowed tier** (every OTHER tenant member — STAFF/STUDENT/PARENT) — NEW:
  - `role=` is now **REQUIRED** and must be one of `ADMIN|MANAGER|TEACHER|STAFF`
    (a narrowed caller can only ever LIST staff-tier people, never other
    students/parents through this endpoint). Missing or
    `role=STUDENT`/`role=PARENT` → `403 MEMBER_LIST_ROLE_FILTER_REQUIRED`.
  - `search=` matches `displayName` ONLY (not email — narrowed callers can't
    probe an email this tier withholds).
  - Row carries `memberId`/`userId`/`displayName` ONLY — `email`/`roles`/
    `status` are **ABSENT** (not null, not empty string — literally missing
    keys; branch on PRESENCE, the same tiered-response idiom already used for
    `dob`/`gender` in `US-E18.35`/`US-E18.41`).
  - A caller with NO recognized tenant role at all → `403
    MEMBER_LIST_FORBIDDEN` (generic, distinct from the narrowed-tier-specific
    `MEMBER_LIST_ROLE_FILTER_REQUIRED`) — map these to TWO different failure
    types, don't collapse them.
  - `role`/`search` still applied AFTER a keyset read (same caveat as before,
    already handled by the existing `SearchMembersUseCase`'s "trust `hasMore`,
    not page length" draining loop — reuse it, don't reimplement).

## Current state (read before touching anything)

`src/features/iam-directory/domain/entities/directory-member.entity.ts`'s
`DirectoryMember` currently has `email`/`roles`/`status` as REQUIRED fields —
this was already known-safe for every existing staff-tier caller (class
picker, staffing, admin roster, teacher directory, etc.) but is now WRONG for
a narrowed-tier caller. Check whether this entity was already widened in a
PRIOR story for a DIFFERENT reason (US-E18.33/US-E18.35/US-E18.41 all
widened `MemberBatchItem`/`MemberSummary` on the `?ids=` BATCH endpoint —
this is the SEPARATE `?tenants/{id}/members` LIST endpoint's own entity,
confirm whether `DirectoryMember` and `MemberSummary`/`MemberBatchItem` are
the same type or genuinely separate ones before widening the wrong one).

`src/features/messaging/domain/repositories/i-messaging.repository.ts`'s
`getContacts()` is currently force-mocked ("`only people-directory endpoint is
role-gated ADMIN/TEACHER-only" per ADR 0060's original finding — now
partially false for a non-staff caller specifically). Check the current
`getContacts()`'s CALLER context: does it know the current actor's own
appRole/BE-role at the point it's invoked (needed to decide staff-tier vs
narrowed-tier query params)? If not, thread it through (same pattern as
`class-management.di.ts`'s tenantId-from-token-claim composition).

## Scope

1. Widen `DirectoryMember` (or confirm+use the correct already-widened
   sibling entity) so `email`/`roles`/`status` are optional, absent (not
   defaulted) for a narrowed-tier response — mirror the EXACT idiom already
   used for `dob`/`gender` (conditional spread in the mapper, never `??`
   defaulting).
2. Add the new `role-filter-required` failure type (distinct from the
   existing generic `forbidden`) to `IamDirectoryFailure`, mapped from
   `403 member_list_role_filter_required` (IAM's raw lowercase code
   convention — do NOT assume UPPER_SNAKE here, re-confirm against
   `US-E18.6`'s finding that IAM emits lowercase i18n keys, not `core`/
   `social`'s UPPER_SNAKE).
3. Wire `getContacts()` real for a non-staff caller: derive the caller's own
   role (already-established pattern — check `decodeRoleClaim`/token-claim
   helpers used elsewhere in `bootstrap/di`), call `SearchMembersUseCase`
   with a role filter from the ALLOWED set (`ADMIN|MANAGER|TEACHER|STAFF`).
   Decide (and document) WHICH role(s) the contact picker should query for a
   STUDENT/PARENT caller — likely `TEACHER` (their teachers) as the primary
   contact-picker use case; check `docs/product/design-spec.jsonc`/
   `screens.md` for the messaging contact-picker's intended scope before
   guessing, and if genuinely ambiguous, default to `TEACHER` and flag the
   decision in Evidence for fe-lead.
4. Confirm parent→parent contact discovery is UNCHANGED — coordinator's note
   says it still goes through the `?ids=` BATCH endpoint (already wired,
   different code path than this list endpoint) — don't touch that path.
5. Confirm staff-tier callers (ADMIN/MANAGER/TEACHER using messaging
   themselves) still get the byte-identical full-row response — add a
   regression test proving this, since the SAME entity/mapper now serves
   both tiers.
6. Map absent-field UI gracefully: a narrowed-tier contact row has no
   `email`/`roles`/`status` to show — check what the contact-picker UI
   currently renders for those fields and adjust (omit, not blank/placeholder
   that implies missing-but-expected data).

## NOT in scope

- Group lifecycle (US-E18.50), message pin (US-E18.51).
- The `?ids=` batch lookup path (parent→parent) — untouched, already real.
- Any other consumer of `DirectoryMember`/`SearchMembersUseCase` — must see
  ZERO behavior change (regression risk given this is the Nth reuse of this
  shared entity/use-case).

## Acceptance Criteria

- Real mode: a STUDENT/PARENT can open the messaging contact picker and see
  a list of staff (role filter TEACHER or whichever is chosen, documented),
  with only `memberId`/`userId`/`displayName` populated.
- Real mode: a staff-tier caller's contact picker (if they use the same
  picker) is unaffected — full row, byte-identical to before.
- `role-filter-required` and generic `forbidden` map to distinct, clear
  failures.
- `USE_MOCK=true` unchanged.
- Zero regression to every OTHER consumer of `DirectoryMember`/
  `SearchMembersUseCase` (class picker, staffing, roster, teacher directory).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | mapper test (presence-based optional fields, staff-tier byte-identical regression), use-case/repository test (role param, 2 distinct 403 codes) |
| Integration | real interceptor pipeline test |
| E2E | Storybook interaction — narrowed-tier contact list, staff-tier contact list unchanged, forbidden state |
| Platform | `bun vitest run` zero-regression, `bun run build` mock+real |
| Release | merged to main, branch deleted |

## Harness Delta

- TEST_MATRIX row for contact-picker non-staff real-mode.
- Close ask #32(c) in the FE→BE report.
- EPIC-OVERVIEW.md Wave 8 row.

## Evidence

Implemented 2026-08-07 on `feat/us-e18.52-contact-picker-non-staff`.

### Entity check first (scope §1) — the packet's warning was right

`DirectoryMember` (LIST endpoint, `tenants/{id}/members`) and
`MemberSummary`/`MemberBatchItemDto` (BATCH endpoint, `members?ids=`) are
GENUINELY SEPARATE types in `features/iam-directory/domain/entities/`.
US-E18.33/35/41 widened the BATCH one (`email`/`roles`/`dob`/`gender`); this
story widened the LIST one (`email`/`roles`/`status`) for the first time, with
the SAME conditional-spread idiom (never `??`, never `email: undefined`).

### Contact-picker role filter: `TEACHER` (the required decision)

`CONTACT_PICKER_ROLE = "TEACHER"` is pinned in `bootstrap/di/messaging.di.ts`
with the reasoning inline. Why:

1. Neither `docs/product/design-spec.jsonc` nor `docs/product/screens.md`
   scopes the messaging contact picker's audience — genuinely ambiguous, so the
   packet's documented default applies.
2. ADR 0129 makes `role=` a REQUIRED single value for a narrowed caller
   (`ADMIN|MANAGER|TEACHER|STAFF`). The endpoint takes ONE role, so covering
   several would mean N full directory drains per page render — a deliberate
   single value, not an oversight.
3. `TEACHER` is the picker's primary job for a STUDENT/PARENT ("nhắn cho giáo
   viên của tôi") and matches the filter every other directory composition
   already pins (`class-management.di.ts`, `principal-teachers.di.ts`).
4. The SAME query serves a staff-tier caller unchanged — they additionally
   receive `email`/`roles`/`status`, of which the picker uses none.

Flagged to `fe-lead` as a product decision: if the picker should also reach
ADMIN/MANAGER/STAFF, that is a multi-drain change (or a BE ask for a
multi-value `role=`), not a one-line edit.

### Staff-tier regression proof (scope §5) — explicitly confirmed

Three layers, all asserting the staff tier is unchanged:

- `iam-directory.mapper.test.ts` — "staff tier — the full row is
  byte-identical to the pre-ADR-0129 shape": exact 6-key `Object.keys` set +
  full `toEqual`.
- `messaging.repository.test.ts` — "maps a STAFF-TIER response identically":
  the contact built from a full row `toEqual`s the one built from a narrowed
  row.
- Full suite: every OTHER `DirectoryMember` consumer (class picker, staffing,
  admin roster, principal teacher directory) passes untouched — 500 files /
  3868 tests, baseline 497/3852.

### Parent→parent (scope §4) — untouched, confirmed

`BatchResolveMembersUseCase` / `batchLookup` / `MemberSummary` /
`MemberBatchItemDto` have ZERO diff. The only shared file touched on the batch
path is `iam-directory.failure.ts` (a NEW union member; `toMemberSummary` and
its tests are unchanged).

### Absent-field UI (scope §6)

The picker never rendered `email`/`status`, so the only affected field was the
free-text `role` caption. `ContactEntity.role` became optional and a stable
`roleKey` was added; the shared `ContactRoleCaption` (one canonical home for
the three pickers that had the same markup three times — decision 0026)
translates `messaging.contactRole.<key>` and renders NOTHING when there is no
role information, rather than an empty line that reads as missing data. The
anticipatory `ContactResponseDto` + `toContactEntity` were DELETED — nothing
ever produced them (the mock repo returns fixtures directly), so they were an
unverified fiction now superseded by the real IAM row.

### Downstream honesty (not scope creep — the compile fallout)

Widening `DirectoryMember` surfaced exactly three field reads:
`class-management` `TeacherMember.email`, `principal` `PrincipalTeacher.email`
and `.status`. All three are staff-tier-only surfaces so the values always
arrive; they were made optional/nullable and carried across CONDITIONALLY (no
`?? ""`, no fabricated `"ACTIVE"`), with the UI omitting the caption/badge.
Zero behavior change in practice.

### Review fix (fe-tech-lead-reviewer, 2026-08-07) — the contacts failure was swallowed

`page.tsx` passed `initialContacts={contactsResult.ok ? … : []}` and dropped the
failure. A 403 `forbidden`, a `role-filter-required` wiring bug or a transport
error therefore rendered an EMPTY picker — indistinguishable from "this school
genuinely has no teachers" — and made the new
`messaging.errors.load-contacts-failed` key dead code.

- `MessagingScreenVM` gained `contactsLoadError?: MessagingFailure["type"]`,
  kept SEPARATE from `loadError` (the conversation list can be healthy while the
  directory is not); `page.tsx` now passes
  `contactsResult.ok ? undefined : contactsResult.failure.type`.
- All THREE contact consumers render it: `new-conversation-modal`,
  `create-group-modal` (step 2) and `add-members-modal`. The banner lives in ONE
  canonical home — `presentation/contacts-error-notice/` (decision 0026) — whose
  markup deliberately mirrors the already-proven `conversation-list` load-error
  banner instead of inventing a second error convention.
  `components/shared/list-error` is NOT reused: it is a full-height card built
  around a retry control, and these contacts are SSR-loaded, so there is no
  client retry to offer inside a dialog.
- The error REPLACES the empty/heading copy in every picker — the two must never
  appear together (contradictory explanations of the same blank list).
- `new-conversation-modal` had NO empty state under the "Gợi ý" heading
  (unreachable while the mock always seeded contacts; reachable now that a real
  tenant's `role=TEACHER` query can return zero rows) → new key
  `messaging.newMessage.noContacts` (vi + en).
- New proof: `messages/page.test.tsx` (RSC composition — success carries no
  error key, a failure carries `load-contacts-failed` instead of a bare `[]`,
  and the conversations channel stays independent);
  `new-conversation-modal.stories.tsx` NEW with `Default`, `EmptyDirectory` and
  **`ContactsLoadForbidden`** (the story the Validation row demanded);
  `add-members-modal.stories.tsx` `ContactsLoadForbidden` for the second
  consumer of the shared notice.

### `CONTACT_PICKER_ROLE = "TEACHER"` also narrows the STAFF-TIER audience (decision note for `fe-lead`)

Understated in the first pass, so stated plainly: the pinned filter applies to
EVERY caller, not just the narrowed tier. An ADMIN/MANAGER using this picker can
now start a DM only with **TEACHERs** — not with other admins/managers/staff —
whereas the retired mock seeded a mixed set. That is a real (if small) behaviour
change for staff-tier users.

**Kept as-is deliberately.** ADR 0129 does not restrict the staff tier, so a
staff caller COULD omit `role=` and drain the unrestricted directory in one
call, but that was rejected:

1. Omitting `role=` returns the WHOLE member directory — every STUDENT and
   PARENT included. Turning a staff member's picker into "DM any of ~2000
   students" is a far larger product change than the defect being fixed, and
   nothing in `design-spec.jsonc`/`screens.md` asks for it.
2. It would make the picker's audience role-dependent (two different products
   behind one component) and would need a token-derived tier branch in the DI
   plus its own RBAC reasoning — for a surface no staff-tier AC covers.
3. The current behaviour is uniform, predictable and fail-safe: everybody sees
   teachers.

The open product ask is unchanged and belongs to `fe-lead`: if the picker must
reach ADMIN/MANAGER/STAFF (for anyone), that is either N directory drains or a
BE ask for a multi-value `role=` — not a one-line edit.

### Commands run (from the worktree)

- `bunx vitest run` → 501 files / 3871 tests pass (baseline 497/3852).
- `bunx vitest run --config vitest.storybook.mts` → 158 files / 1241 tests pass.
  Note: two of three consecutive runs showed ONE intermittent failure in
  `staff-discipline-screen.stories.tsx` (a feature this story never touches);
  it passes in isolation (40/40) and in a clean full run — a pre-existing
  parallel-load flake, not a regression.
- `bunx tsc --noEmit` → clean.
- `bun lint` → clean (1 pre-existing warning + 1 info in `messaging`, untouched
  by this story).
- `bun run build` → exit 0.

### Harness delta done

- `docs/TEST_MATRIX.md` row `US-E18.52` (`implemented`).
- `EPIC-OVERVIEW.md` Wave 8 row.
- Cross-repo ask #32(c) closed.

