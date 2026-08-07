# US-E18.48 Timetable conflicts scan real + admin UI (BE US-188, ADR 0128)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/admin/timetable/`
- Shared contract/file: `TIMETABLE_EP` (or equivalent), `i-timetable.repository.ts`'s `getConflicts`, `ConflictInfo` entity

## Ground truth (fe-lead, verified before delegating against `edu-api` local checkout, US-188, ADR 0128)

`edu-api/services/core/docs/openapi.yaml` (~L812, `GET /api/v1/timetable/conflicts`):

- **⚠️ ADMIN/SUPER_ADMIN ONLY** — "the same gate as `PUT
  /api/v1/classes/{classId}/timetable`". **MANAGER is explicitly NOT
  authorized for this whole-school scan.** Do NOT expose this to the
  `principal` appRole/any principal-facing screen — this is `admin/timetable`
  ONLY.
- Query param: `termId` (required, uuid). An unknown/nonexistent `termId`
  returns `200` with an empty `conflicts` array — NOT 404.
- Response `{termId, conflicts: [...], truncated: boolean}` — recomputed FRESH
  from base timetable data every call (never from a cache/clone that can
  drift). Bounded scan (internal page size 200 classes, hard budget 2000
  classes / 500 conflict entries) — `truncated: true` means there MAY be more
  conflicts than shown; this is NOT an error state, re-running the scan is
  always safe.
- **Two conflict types**, deterministically ordered (sorted by type, day,
  period, then conflict key — so repeated scans are stable):
  - `TEACHER_DOUBLE_BOOKED` — same semantics as the existing reactive `PUT`
    409 `TIMETABLE_TEACHER_CONFLICT`: two different classes hold the same
    teacher at the same `(day, period)`.
  - `ROOM_DOUBLE_BOOKED` — two different classes hold the same non-empty room
    at the same `(day, period)`. **⚠️ ADR 0128: reported for VISIBILITY ONLY
    — the write path (`PUT` timetable) does NOT reject room conflicts.** Do
    NOT assume creating/editing a slot with a duplicate room will ever 409 —
    it won't. This is a pre-existing data gap surfaced for admins to resolve
    manually, not something the write path enforces.
- Conflict entry shape (confirm exact field names against the schema, not
  just this summary): `{type, day, period, classes: [{classId, subjectId}, …
  ≥2 entries], teacherMemberId?, room?}` — `classes` carries `subjectId` too
  (not just `classId`), and `teacherMemberId`/`room` are present depending on
  conflict `type` (a `TEACHER_DOUBLE_BOOKED` entry has `teacherMemberId`, a
  `ROOM_DOUBLE_BOOKED` entry has `room`).
- Class-level double-booking is STRUCTURALLY IMPOSSIBLE (a class holds ≤1
  slot per `(day, period)` by construction) and is never reported — don't
  build UI for a case that can't occur.

## Current state (read before touching anything)

- `src/features/admin/timetable/domain/repositories/i-timetable.repository.ts`
  — `getConflicts(classId: string, yearId: string): Promise<ConflictInfo[]>`.
  **Signature mismatch**: the real endpoint is whole-tenant + `termId`-scoped,
  NOT `classId`-scoped — this method's signature itself is wrong for the real
  contract and needs to change (drop `classId`, `yearId` → `termId`, check
  how `termId` is resolved elsewhere in this app — the `resolve-current-term`
  helper used by other BE-wiring stories, e.g. US-E18.7/US-E18.11, is the
  established precedent, reuse it rather than inventing a new term-resolution
  path).
- `ConflictInfo` entity (`timetable.entity.ts`) — currently
  `{teacherId, day, period, classIds}` (teacher-conflict ONLY, no room
  conflict concept, `classIds: string[]` not `{classId,subjectId}[]`). This
  entity needs widening: a `type` discriminant
  (`"teacher-double-booked" | "room-double-booked"`, translated stable keys —
  never the raw BE enum on the wire, decision 0008 convention), `classes:
  {classId, subjectId}[]`, optional `teacherMemberId`/`room` depending on
  type.
- `detect-conflicts.use-case.ts` (`detectConflicts()`) — a PURE client-side
  teacher-conflict detector over the CURRENT SCREEN's already-loaded slots
  (single-class, reactive-adjacent helper). This is UNRELATED to the
  whole-school proactive scan — it operates on data already in memory for
  the CURRENT class being edited, not a tenant-wide read. Do NOT conflate the
  two; check whether it stays as a genuinely separate, still-useful
  local-conflict highlight (`conflictCell` in `design-spec.jsonc`) or if this
  story's new whole-school scan makes it redundant — my read is they serve
  different purposes (immediate inline highlight for THIS class's cells you
  can see, vs. a discoverable list of EVERY conflict in the tenant) and
  should probably coexist; confirm and document your reasoning either way.
- `timetable.repository.ts` (real) — `getConflicts()` currently a permanent
  `[]` stub with a comment citing ask #16 (now closed). **Zero current
  callers anywhere in `src/app/` or `src/bootstrap/di/`** — this method has
  never been wired to any UI. Building the UI surface is part of THIS
  story's scope (see below), not a pre-existing screen you're just repointing.
- `docs/product/design-spec.jsonc` has NO entry for a whole-school "conflict
  summary" card — only a per-slot `conflictCell` spec (already implemented,
  reactive). This is genuinely NEW UI, not a redesign of an existing surface.

## Scope

1. Fix `getConflicts`'s signature: drop `classId`, take `termId` (resolved
   via the established shared term-resolver, or accept it from the caller if
   the admin timetable screen already has a term selector — check
   `timetable-screen.tsx`/`build-timetable-vm.ts` for an existing term
   context before adding a redundant one).
2. Widen `ConflictInfo` (or introduce a new entity if the shape divergence is
   too large to keep one name — your call) to carry `type`,
   `classes: {classId, subjectId}[]`, optional `teacherMemberId`/`room`.
   Keep `detectConflicts()`'s existing per-cell reactive highlight working
   unchanged if you decide the two stay separate (most likely correct call).
3. Wire `getConflicts()` real: `GET /api/v1/timetable/conflicts?termId=`,
   map `truncated` through (surface it in the UI — "may be more conflicts,
   re-run scan" hint, not silently dropped). Ground-truth the actual error
   surface (400/401/403 — likely no special codes beyond generic ones, but
   confirm against `ERROR_CODES.md`, don't assume the reactive
   `TIMETABLE_TEACHER_CONFLICT` code applies here — this is a GET, not the
   `PUT` that returns that 409).
4. **Build the UI surface** (genuinely new — full design-review gate
   required, per repo rule): a compact "Xung đột toàn trường" (whole-school
   conflicts) summary card/section on `(app)/admin/timetable`, ADMIN-visible
   ONLY (confirm this route has no MANAGER/principal access at all — check
   the route's layout guard). Reuse EXISTING component patterns
   (`StatCard`-style count, `ListError`/`ListSkeleton` for
   loading/error/empty, badge/tone tokens already in the design system) —
   do NOT invent new visual language for this; it's data-driven wiring on an
   established admin screen, not a new product surface needing the full
   `/uiux` pipeline. List each conflict with type icon/label, day/period,
   the ≥2 classes involved, and a "jump to this class's builder" link if
   feasible (reuse existing navigation patterns). Show the `truncated` hint
   when true. A `ROOM_DOUBLE_BOOKED` entry's copy must NOT imply the write
   path prevents this (ADR 0128) — phrase it as "phát hiện, cần xử lý thủ
   công" (detected, needs manual resolution), not "sẽ được ngăn khi tạo mới".
5. `MockTimetableRepository`'s `getConflicts` — extend fixtures to cover both
   conflict types + a `truncated: true` case for Storybook/dev-mode.

## NOT in scope

- Any change to the write path (`PUT` timetable) — room conflicts stay
  unenforced there, by design (ADR 0128), not a bug to fix.
- `detectConflicts()`'s per-cell reactive highlight — keep working, don't
  fork/duplicate it into the new scan unless you determine they should
  actually merge (document if so).

## Acceptance Criteria

- Real mode, ADMIN role: `/admin/timetable` shows a whole-school conflicts
  summary for the current term, both conflict types rendered distinctly,
  `truncated` surfaced when true.
- MANAGER/principal cannot reach this surface at all (confirm via the route
  guard, not just by omitting a nav link).
- Copy never implies the write path blocks room double-booking.
- `USE_MOCK=true` demoable with both conflict types + truncated state.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | repository test (termId param, response mapping, both conflict types, truncated passthrough), entity/mapper test |
| Integration | real interceptor pipeline test |
| E2E | Storybook interaction — both conflict types render, truncated hint, empty/loading/error states |
| Platform | `bun vitest run` zero-regression, `bun run build` mock+real |
| Release | design-review gate (`impeccable detect.mjs`) + a11y audit required (genuinely new UI surface) before merge |

## Harness Delta

- TEST_MATRIX row for the conflicts scan.
- Close ask #16 in the FE→BE report.
- EPIC-OVERVIEW.md Wave 7 row.
- `docs/product/screens.md` note for `/admin/timetable` (new surface) + `docs/product/design-spec.jsonc` entry if the design-review gate requires one for a genuinely new component (check `.claude/rules/design-system.md` for when a spec entry is mandatory vs. optional for a small additive card).

## Evidence

Implemented 2026-08-07 (`feat/us-e18.48-timetable-conflicts-scan-real`).

### Contract re-ground-truthed (not taken from the packet summary)

Checked BOTH `services/core/docs/openapi.yaml` (`TimetableConflictEntry` /
`TimetableConflictsResponse`, ~L8233–8299) AND the Go structs that actually
serialise it (`internal/timetable/adapter/http/dto/conflicts.go`,
`core/application/dto/conflicts.go`) — they agree. Two details the summary did
not spell out and that changed the code:

- `day` is the **`MON|TUE|WED|THU|FRI` string enum**, not a number — joined by
  the existing `day-enum.ts` bridge.
- `teacherMemberId` / `room` carry Go **`omitempty`**, so they are ABSENT (not
  `null`, not `""`) on the kind that does not own them. That is what makes a
  discriminated union safe and why an entry missing its kind-defining field is
  dropped rather than coerced.
- `scannedClassCount` exists in the application DTO but is deliberately NOT in
  the HTTP contract — not declared FE-side.
- Error surface: no conflict-specific codes. `get_timetable_conflicts.md`
  authorises first (403 `TIMETABLE_FORBIDDEN`, zero reads) then parses
  (`timetable_invalid_tenant_id` / `timetable_invalid_term_id`, 400). All three
  were already in `mapTimetableFailure`'s 11-code taxonomy — no new failure
  type. The reactive `TIMETABLE_TEACHER_CONFLICT` 409 does NOT apply to this GET.

### Design decisions

1. **Signature, not just implementation.** `getConflicts(classId, yearId)` →
   `getConflicts()`. The endpoint's path is FLAT (`/api/v1/timetable/conflicts`,
   not nested under `/classes/{id}`), the tenant comes from the token claim, and
   `termId` is the only input — resolved inside the repo via the established
   shared `resolveCurrentTermId()` (US-E18.11), because the builder screen has a
   mock YEAR selector, not a term. A test asserts the requested path does not
   contain `/classes/`.
2. **`ConflictInfo` widened into a discriminated union** rather than a flat
   optional-field record, so `room` on a teacher conflict is a compile error.
   That is what structurally keeps the two BE-distinct semantics (rejected on
   write vs detected on read) from sharing copy. New `TimetableConflictScan`
   wrapper carries `termId` + `truncated`.
3. **`TimetableData.conflicts` DELETED.** It was hard-coded `[]` by the real
   mapper — a fiction field no real read could ever fill. The scan is now the
   single conflict source, which also makes the per-cell highlight
   (`conflictSlotKeys`) real in real mode for the first time.
4. **`detectConflicts()` KEPT, extended, not merged/forked.** Ground-truth
   correction to the packet's premise: it is NOT a client-side per-cell
   highlighter — its only caller is `MockTimetableRepository`. It is the mock's
   conflict ENGINE (the `USE_MOCK` stand-in for the BE scan), and
   `presentation/` never imports it. So the two do not compete: they are the two
   implementations of one port. It was extended to emit room conflicts and the
   BE's deterministic `(type, day, period, key)` order so mock mode mirrors real.
   The per-cell highlight lives where it always did — in `buildTimetableVM`.
5. **One conflicts surface, not two.** The screen already had a mock-only
   `ConflictSummary` (ported from `design_src/edu/timetable.jsx`) fed by the
   permanently-empty `TimetableData.conflicts`. The new `ConflictScanPanel`
   REPLACES it (decision 0026 — one component, one home); adding a second
   whole-school card next to it would have been the duplication the rule bans.
6. **ADR 0128 copy.** Room rows use `warning` tone (not `error`) and carry
   `conflicts.roomManualHint` — "trùng phòng chỉ được phát hiện khi rà soát; hệ
   thống không chặn khi lưu tiết nên cần xử lý thủ công". Their action label is
   "Xem để xử lý", not "Giải quyết". Nothing in the copy implies a 409.
7. **`Suspense` + `Promise.all`.** The scan is a bounded but genuinely heavy
   tenant-wide read (BE pages up to 2000 classes); it runs in parallel with the
   class read and the whole content streams behind a skeleton.
8. **Honest degrade.** `ConflictScanVM` is a union — a failed scan is
   `{status:"error"}`, structurally never an empty row list, so "Không có xung
   đột" (a strong whole-school claim) can never be shown for a read that did not
   complete. Rendered with the shared `ListError` + a `router.refresh()` retry;
   the grid stays fully usable.

### Role gate (AC: MANAGER/principal unreachable)

`(app)/admin/layout.tsx` → `evaluateAdminAccess` → `evaluateNamespaceAccess`
with **strict equality** `role === "admin"`. BE `MANAGER` **and** `ADMIN` both
collapse onto the appRole `principal` (`role-meta.ts` `ROLE_ENUM_TO_APP`), so
neither reaches `/admin/*`. Proven end-to-end (claim decode → verdict, not just
a hand-written appRole) in `admin-only-reachability.test.ts`. No principal-facing
route or component references the scan.

> ⚠️ Flagged to `fe-lead` (pre-existing, platform-wide, NOT introduced here):
> because no BE role enum maps to the appRole `admin`, the ENTIRE `/admin/*`
> namespace is reachable only with a token whose `role` claim is literally
> `"admin"` — i.e. mock mode. This over-satisfies the AC but means the real-mode
> surface is currently unreachable by the very role the endpoint authorises.
> Changing `ROLE_ENUM_TO_APP` would move every BE ADMIN user out of the
> `principal` namespace app-wide — an ADR-level decision, not a story fix.

### Proof

- `bunx vitest run` — **491 files / 3750 tests pass**, zero regression.
- `bunx vitest run --config vitest.storybook.mts` — **156 files / 1221 tests
  pass** (7 timetable stories incl. `RoomConflict`, `BothConflictKinds`,
  `TruncatedScan`, `ConflictScanError`).
- `bunx tsc --noEmit` — clean.
- `bun run build` — green in mock mode AND with `NEXT_PUBLIC_USE_MOCK=false`.
- `bun lint` — clean (Biome; the 1 warning + 1 info are pre-existing, in
  unrelated files).
- Design hook (`impeccable` PostToolUse) reported **no anti-patterns** on every
  new/edited UI file.

### Harness delta done

`docs/TEST_MATRIX.md` row · `docs/product/screens.md` (`/admin/timetable`) ·
`docs/product/design-spec.jsonc` §`timetableConflictScanPanel` (new — the panel
has no handoff mockup, so this entry is its normative source; no new token, no
new visual language) · `EPIC-OVERVIEW.md` Wave 7 · ask **#16 closed** in
`docs/reports/2026-08-06-fe-to-be-asks.md`.
