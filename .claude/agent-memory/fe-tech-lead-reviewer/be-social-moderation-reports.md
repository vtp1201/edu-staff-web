---
name: be-social-moderation-reports
description: Ground-truthed social /reports contract (ADMIN-only gate, composite point-read key, no audit trail) — reuse instead of re-reading openapi
metadata:
  type: reference
---

Ground-truthed 2026-08-02 against `edu-api@61fc50ce services/social/docs/openapi.yaml`
(+ `ERROR_CODES.md`) during US-E18.32. Re-verify before citing, but this saves a full read.

- `GET /api/v1/reports` (yaml ~3477): `status` ∈ {PENDING,RESOLVED} default PENDING —
  **`all` is deliberately unsupported** (two partition walks); unknown value = 400, never a
  silent fallback. `contentType` + `search` (≤200 chars, matches `reasonFreeText` ONLY) are
  in-app filters over a **bounded 10×100 scan** ⇒ *a short/empty page with `hasMore=true` is
  NORMAL*. Any UI that gates "load more" on a non-empty page is wrong for this endpoint.
- `GET /reports/stats` (yaml 3589): flat `{pending, resolved}` from a best-effort counter
  table, explicitly **unfiltered** — the yaml literally says "do not derive these numbers from
  a filtered list page". No `resolvedThisWeek`/`removed` subset exists.
- `GET /reports/{reportId}` (yaml 3628): `reportId` is a **clustering column, not a partition
  key** → `filedAt` REQUIRED + `status` optional-default-PENDING as query params, echoed from
  the list row. "This URL is not standalone-shareable — do not build a bare deep link."
  Unresolvable tuple (incl. cross-tenant) = 404 `REPORT_NOT_FOUND`, never 403.
- `POST /reports/{id}/resolve`: `ResolveReportRequest.required = [action, filedAt]` (CAS key).
  `action: DELETE` is wired for MESSAGE **and** POST **and** COMMENT, so a queue-driven comment
  takedown goes through resolve (the direct route
  `POST /feeds/posts/{postId}/comments/{commentId}/moderate-delete` needs a parent postId that a
  report row does not carry). COMMENT delete is IRREVERSIBLE — never a 409, a repeat is 404.
- `ReportInboxItem` = the report row ONLY: no `reporterUserId` (NFR-098-01, permanent DTO-shape
  omission), no content preview, no content author, no duplicate-report count, no resolve note.
  `resolvedByUserId` is a raw user id, never a display name. Detail returns the SAME shape.
- **No tenant-wide content-moderation audit trail exists.** `GET /rooms/{roomId}/moderation-audit`
  (US-086, yaml 781) is a ROOM role/mute/capability audit gated on `manage_room` — a different
  concept. Still open as of 61fc50ce.
- **Gate is tenant-wide `IAMRole == ADMIN` only** for list/stats/detail/resolve
  (`REPORT_NOT_ADMIN`, 403; ERROR_CODES.md:351) — "no room-MODERATOR/room-ADMIN alternative".
  Since `ROLE_ENUM_TO_APP` maps BOTH ADMIN and MANAGER → app `principal`, a MANAGER principal
  hard-403s on `/principal/moderation` (a permanent sidebar item). Third instance of
  "MANAGER missing from a BE allow-list" — see [[conventions]] (`list_classes.go`, timetable
  `get_member_timetable.go`). Verify the failure is surfaced as `forbidden`, not collapsed
  into empty.
