/**
 * noti (notification) service — contract-first (decision `0009`); BE follows.
 * notification is a background worker — **no HTTP route through Kong** (ADR 0030).
 * SSE delivery is via an internal Next.js proxy (`app/[locale]/api/stream`).
 * Path here is the upstream URL the proxy calls directly (not through Kong).
 * Real wiring deferred to US-E06.2.
 */
export const NOTI_EP = {
  /** Upstream SSE event stream proxied by `app/[locale]/api/stream`. */
  stream: "/events/stream",
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
