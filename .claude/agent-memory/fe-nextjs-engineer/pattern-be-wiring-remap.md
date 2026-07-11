---
name: pattern-be-wiring-remap
description: E18 BE-wiring US pattern — flat wire DTO reshape, per-parent fan-out to reassemble nested entity, create+activate orchestration, full error-code matrix, proactive ensureFreshSession in DI
metadata:
  type: project
---

E18 epic swaps mock-first repos → real edu-api contract. Recurring remap shape (US-E18.1 calendar, mirrors US-E18.0 school-config):

**Why:** mock-first repos were written against *guessed* wire shapes; the real `edu-api/services/<svc>/docs/openapi.yaml` + `ERROR_CODES.md` are the contract authority. Fixes stay at infra layer (DTO/mapper/repo/error-map) — domain entity + presentation VM contract must NOT change (zero UI regression is the epic AC).

**How to apply:**
- **Flat wire → nested entity.** BE returns separate resources (e.g. year has no nested `terms[]`). Keep the domain entity nested; split the mapper: `fromFlatDto(dto): Omit<Entity,"children">` + `fromDto(dto, childDtos[]): Entity`. Repo reassembles by fanning out to `listChildren(parentId)` per parent via `Promise.all` inside the try (raw http throws unmapped ApiError → outer catch maps it).
- **status enum → boolean.** `isActive = status === "ACTIVE"`. Filter soft-deleted (`status === "ARCHIVED"`) out of list to preserve mock's "disappears" UX (BE doesn't hard-delete).
- **Non-atomic orchestration** (create-then-activate): do the POST inside try (maps its own errors), then call the second op (`activateYear`) OUTSIDE the try so its already-mapped `CalendarFailure` isn't double-mapped by the outer `mapCalendarFailure(err)` (which would return `unknown` — errorCodeOf on a failure object is undefined). Don't roll back if BE has no delete endpoint.
- **Full error matrix.** Cover EVERY `<PREFIX>_*` code in ERROR_CODES.md, branch on `error.code` never message. Watch for pre-existing WRONG mappings (calendar had `CALENDAR_FORBIDDEN`→network-error). Defensive-map id-format codes (they come from prior API responses, not user input) to nearest not-found/forbidden, never fall to `unknown`.
- **Proactive refresh gap.** Every real (`!USE_MOCK`) DI factory must `await ensureFreshSession()` (from `@/bootstrap/di/auth.di`) before `createServerHttpClient()`. Documented in decision 0018 but historically only wired in auth.di — each wiring US closes it for its own cluster. Copy comment style from `admin-school-setup.di.ts`.
- **Mock repo** operates on domain entities → unaffected by DTO remap; just add a NOTE comment documenting real-path semantic divergences (soft-delete, no auto-swap) so readers don't assume parity.
- **Error rendering** in calendar-screen is generic `tErrors(errorKey)` where `errorKey: Failure["type"]` — adding union members + i18n keys (vi+en) is enough; tsc enforces coverage, no switch case. Verify the screen isn't doing an exhaustive switch before assuming. NOTE: staffing duplicates the SAME `errors.*` namespace under each screen (departments/positionTitles/assignments) — add every new failure key to ALL of them in vi+en.

**US-E18.2 staffing add-ons (confirmed sub-patterns for fields BE doesn't return):**
- **id rename is near-universal.** Wire uses `<entity>Id` not `id` (departmentId/positionTitleId/positionAssignmentId, like calendar's academicYearId). Also watch timestamp renames (`createdAt`→domain `assignedAt`). Always diff the DTO field-by-field against openapi even when the audit says "MATCH".
- **Derived count (not on wire).** When a list badges an interpolated count (e.g. `activeAssignmentCount`), prefer real derivation over `0`-fallback: private helper fully paginates the source list (`?status=ACTIVE` cursor loop until `!hasMore`), builds count Maps keyed by the join id, `Promise.all` the count-fetch alongside the main list fetch inside the try. Apply to single get/patch too so use-case guards read a real count. `0`-fallback is the documented alternative (US-E18.1 hasGrades precedent) — say which you took.
- **Join name from a sibling list.** `positionTitleName`-style fields: fetch the sibling list, build `id→name` Map, join. Missing entry → fall back to the id string.
- **No-source name gap.** IAM `MemberResponse` has NO name field and no by-id user lookup (only `/users/me` self) → `memberName` falls back to raw `memberId` with a comment; file cross-repo ask. Do NOT hide the column.
- **Derive a required-on-wire field from a related resource.** BE required `scopeEntityType` absent from web input → repo does `GET /position-titles/{id}` to read `scopeType`, sends it in the POST body (and reuses the fetched entity for the name join). Keeps it repo-only, no UI/domain field.
- **Mapper takes derived extras as params.** `toDepartment(dto, count=0)`, `toPositionAssignment(dto, {memberName, positionTitleName})` — the repo threads in what the wire lacks.
