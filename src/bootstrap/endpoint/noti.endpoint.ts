/** noti (notification) service — contract-first (decision `0009`); BE follows. */
export const NOTI_EP = {
  /** Upstream SSE event stream proxied by `app/[locale]/api/stream`. */
  stream: "/events/stream",
} as const;
