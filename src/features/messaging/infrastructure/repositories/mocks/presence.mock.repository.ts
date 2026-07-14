import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  PresenceRecord,
  PresenceState,
} from "@/features/messaging/domain/entities/presence";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";
import type { IPresenceRepository } from "@/features/messaging/domain/repositories/i-presence.repository";
import { ok, type Result } from "@/features/messaging/domain/use-cases/result";
import { MOCK_CONTACTS, MOCK_CONVERSATIONS, MOCK_GROUPS } from "./fixtures";

/**
 * In-memory mock for INT-401 (`noti` presence — not shipped, decision 0014).
 * Presence is DERIVED from the existing fixtures' `isOnline` boolean so all
 * three states are exercisable in Storybook/dev without new fixture files:
 *   - `isOnline: true`  → `online`
 *   - `isOnline: false` → deterministic `recent`/`offline` split seeded by an
 *     id hash (same input → same output; no `Math.random()`).
 *
 * Unknown member ids are OMITTED from the response — treating a missing record
 * as offline is a presentation-layer concern (FR-004 safe default), not a repo
 * one, so the repo stays honest about what it actually knows.
 */
export class MockPresenceRepository implements IPresenceRepository {
  private readonly onlineById: Map<string, boolean>;

  /** `now` injectable so `lastActiveAt` buckets are deterministic under test. */
  constructor(private readonly now: () => number = Date.now) {
    this.onlineById = buildOnlineMap();
  }

  async getPresence(
    memberIds: string[],
  ): Promise<Result<PresenceRecord[], MessagingFailure>> {
    await mockDelay(120);
    const nowMs = this.now();
    const records: PresenceRecord[] = [];
    for (const id of memberIds) {
      const isOnline = this.onlineById.get(id);
      if (isOnline === undefined) continue; // unknown → omitted
      const presence: PresenceState = isOnline
        ? "online"
        : hash(id) % 2 === 0
          ? "recent"
          : "offline";
      records.push({
        memberId: id,
        presence,
        lastActiveAt: new Date(nowMs - offsetFor(presence)).toISOString(),
      });
    }
    return ok(records);
  }
}

/** Coarse bucket offset from `now` per state (ms): online=0, recent=3m, offline=2d. */
function offsetFor(state: PresenceState): number {
  if (state === "online") return 0;
  if (state === "recent") return 3 * 60_000;
  return 2 * 24 * 60 * 60_000;
}

/** Deterministic 32-bit string hash (djb2-ish); no randomness. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Collect id → isOnline from every fixture source (contacts, direct
 * conversations, group members). First writer wins so the map is stable.
 */
function buildOnlineMap(): Map<string, boolean> {
  const map = new Map<string, boolean>();
  const set = (id: string, online: boolean) => {
    if (!map.has(id)) map.set(id, online);
  };
  for (const c of MOCK_CONTACTS) set(c.id, c.isOnline);
  for (const c of MOCK_CONVERSATIONS) {
    if (c.type === "direct" && c.isOnline !== undefined) set(c.id, c.isOnline);
  }
  for (const g of Object.values(MOCK_GROUPS)) {
    for (const m of g.members) set(m.userId, m.isOnline);
  }
  return map;
}
