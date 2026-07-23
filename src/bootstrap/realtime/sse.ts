import type { RealtimeEvent } from "./event";

/**
 * Serialise an event into an SSE frame (`id` / `event` / `data`, blank-line
 * terminated). `id` feeds the browser's `Last-Event-ID` resume on reconnect.
 */
export function toSseFrame(event: RealtimeEvent): string {
  // `eventId` is optional across the union (real frames never send it); omit the
  // `id:` line entirely when absent rather than emitting "id: undefined".
  const idLine = event.eventId !== undefined ? `id: ${event.eventId}\n` : "";
  return `${idLine}event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/** SSE comment heartbeat — keeps the proxied connection alive through hops. */
export const SSE_PING = ": ping\n\n";
