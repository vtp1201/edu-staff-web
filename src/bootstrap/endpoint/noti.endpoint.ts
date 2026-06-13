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
} as const;
