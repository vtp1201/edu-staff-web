/**
 * noti (notification) service — contract-first (decision `0009`); BE follows.
 * The notification service has grown a `cmd/server` HTTP+SSE surface
 * (US-E18.18): the real SSE path is `/api/v1/stream`. The proxy still calls this
 * upstream URL DIRECTLY (not through Kong) per ADR `0009`/`0030` — that
 * direct-bypass architecture is unchanged here; only the path string is fixed.
 *
 * NOTE (US-E18.18, correction #2): the direct-bypass call carries a `Bearer`
 * token, but the service now trusts ONLY Kong-injected `X-Edu-Claims` headers
 * (edu-api ADR `0047`), so a live real stream will 401 until the proxy routes
 * through Kong (chicken/egg with the Kong-routing gap). Live verification stays
 * deferred; the path fix is correct regardless.
 */
export const NOTI_EP = {
  /** Upstream SSE event stream proxied by `app/[locale]/api/stream`. */
  stream: "/api/v1/stream",
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
