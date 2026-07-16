/**
 * Staff-leave endpoint constants (US-E09.3, `core` service).
 * No magic strings in repositories.
 *
 * Real contract ground-truthed for US-E18.8 against
 * `edu-api/services/core/docs/openapi.yaml` (`/api/v1/conduct/staff-leave-requests*`)
 * + Go source (`internal/conduct/adapter/http/staff_leave_request_handler.go`).
 * Kept accurate for documentation even though the real repository no longer
 * calls these (see `staff-leave.repository.ts` — the whole feature stays
 * mock-first permanently, cross-repo ask #13, `EPIC-OVERVIEW.md`).
 *
 * - `list`: `GET` requires a **mandatory** `staffMemberId` query param — no
 *   tenant-wide oversight list exists.
 * - `approve`/`reject`: `POST` (not `PUT`), both require a mandatory
 *   `staffMemberId` **query** param alongside the path `id`; `reject`'s body
 *   key is `rejectionReason` (not `reason`).
 * - `submit`: self-service `POST`, not consumed by this admin-only screen.
 */
export const STAFF_LEAVE_EP = {
  submit: "/core/api/v1/conduct/staff-leave-requests",
  list: "/core/api/v1/conduct/staff-leave-requests",
  approve: (id: string) =>
    `/core/api/v1/conduct/staff-leave-requests/${id}/approve`,
  reject: (id: string) =>
    `/core/api/v1/conduct/staff-leave-requests/${id}/reject`,
} as const;
