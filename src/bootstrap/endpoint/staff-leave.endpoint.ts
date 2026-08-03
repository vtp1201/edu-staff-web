/**
 * Staff-leave endpoint constants (US-E09.3, `core` service).
 * No magic strings in repositories.
 *
 * Real contract ground-truthed for US-E18.8, re-verified US-E18.36 against
 * `edu-api/services/core/docs/openapi.yaml` (`/api/v1/conduct/staff-leave-requests*`)
 * + Go source (`internal/conduct/adapter/http/staff_leave_request_handler.go`).
 * LIVE since US-E18.36 — `staff-leave.repository.ts` calls all three.
 *
 * - `list`: `GET`. `staffMemberId` is **optional** since core US-149 — OMIT it
 *   to get the tenant-wide oversight list (ADMIN/MANAGER/SUPER_ADMIN), which
 *   is `status`-sliced and defaults to `SUBMITTED`.
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
