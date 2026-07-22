/**
 * Pure derivations for fields the real `social` room/message contract does NOT
 * carry on the wire (US-E18.17, ADR 0060). The real `RoomSummary`/`Message`
 * schemas have no avatar initials, no semantic colour, and only an ISO
 * `createdAt`/`lastMessageAt` — so the client derives display initials, a stable
 * colour, and formatted time/date deterministically. No raw colour is ever
 * emitted here — only a semantic tone KEY, resolved to a token class at the
 * presentation boundary (see `presentation/avatar-tone.ts`).
 */

/** The 7 semantic tone keys shared with `avatar-tone.ts` (tokens-only). */
const COLOR_ROTATION = [
  "primary",
  "success",
  "warning",
  "error",
  "info",
  "purple",
  "teal",
] as const;

/** Initials from a name: first letters of the first two words, or first two
 *  chars of a single word; `?` when blank. */
export function roomInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

/** Deterministic, stable colour tone key derived by hashing the room id into
 *  the 7-colour rotation (same id → same tone across renders/requests). */
export function roomColorKey(roomId: string): string {
  let hash = 0;
  for (let i = 0; i < roomId.length; i++) {
    hash = (hash * 31 + roomId.charCodeAt(i)) >>> 0;
  }
  return COLOR_ROTATION[hash % COLOR_ROTATION.length];
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Format an ISO timestamp into the display `time` (HH:MM) + `date`
 * (dd/mm/yyyy) the conversation-item / date-divider rendering expects.
 * Deliberately NOT a relative label ("Hôm nay"/"Hôm qua") — those are a
 * locale/presentation concern the wire does not carry, and putting Vietnamese
 * literals in an infrastructure mapper would violate the i18n rule. Returns
 * empty strings for an unparseable input (defensive, never throws).
 */
export function formatWireTimestamp(iso: string): {
  time: string;
  date: string;
} {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { time: "", date: "" };
  return {
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
  };
}
