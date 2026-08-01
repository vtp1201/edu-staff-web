/**
 * noti (notification) service — contract-first (decision `0009`); BE follows.
 * The notification service has grown a `cmd/server` HTTP+SSE surface
 * (US-E18.18): the real SSE path is `/api/v1/stream`.
 *
 * US-E18.22 (ADR `0065`): Kong now routes `notification` (`/noti` prefix,
 * `gateway/kong/kong.yml`), and `edu-api` ADR `0047` retired per-service
 * Bearer-JWT verification in favor of Kong-injected `X-Edu-Claims` — so the
 * SSE proxy (`app/[locale]/api/stream/route.ts`) now routes through Kong
 * (`NEXT_PUBLIC_API_URL`) like every other repository call, instead of the
 * retired direct-bypass `NOTI_SERVICE_URL`. `stream` therefore carries the
 * full Kong-prefixed path, matching `ANNOUNCEMENTS_EP`'s `/noti/api/v1/*`
 * convention below. Live-verified through a real `make stack-up` Kong
 * gateway (200 with Bearer token, 401 without) — see ADR `0065`.
 */
export const NOTI_EP = {
  /** Upstream SSE event stream proxied by `app/[locale]/api/stream`. */
  stream: "/noti/api/v1/stream",
  /**
   * Presence snapshot (INT-401, US-E10.6 — mock-first). Path prefix assumed per
   * the ANNOUNCEMENTS_EP `/noti/api/v1/*` precedent (OQ-2); confirm against
   * `noti`'s openapi.yaml when its REST surface ships.
   */
  presence: "/noti/api/v1/presence",
} as const;

/**
 * Announcements REST endpoints (US-E10.3 — noti service, mock-first).
 * Real wiring lands when the noti HTTP surface exists; until then the DI
 * factory selects the mock repo via NEXT_PUBLIC_USE_MOCK.
 */
export const ANNOUNCEMENTS_EP = {
  list: "/noti/api/v1/announcements",
  create: "/noti/api/v1/announcements",
  update: (id: string) => `/noti/api/v1/announcements/${id}`,
  delete: (id: string) => `/noti/api/v1/announcements/${id}`,
  recipients: (id: string) => `/noti/api/v1/announcements/${id}/recipients`,
  remind: (id: string) => `/noti/api/v1/announcements/${id}/remind`,
} as const;
