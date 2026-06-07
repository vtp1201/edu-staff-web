import type { RealtimeEvent } from "./event";

/**
 * Serialise an event into an SSE frame (`id` / `event` / `data`, blank-line
 * terminated). `id` feeds the browser's `Last-Event-ID` resume on reconnect.
 */
export function toSseFrame(event: RealtimeEvent): string {
  return `id: ${event.eventId}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/** SSE comment heartbeat — keeps the proxied connection alive through hops. */
export const SSE_PING = ": ping\n\n";
