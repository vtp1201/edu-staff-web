import { describe, expect, it } from "vitest";
import { MockPresenceRepository } from "./presence.mock.repository";

// Fixed clock so lastActiveAt buckets are deterministic in assertions.
const NOW = Date.parse("2026-07-14T10:00:00Z");
const makeRepo = () => new MockPresenceRepository(() => NOW);

describe("MockPresenceRepository", () => {
  it("returns one record per known member id", async () => {
    const repo = makeRepo();
    const res = await repo.getPresence(["u1", "u3", "u5"]);

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.map((r) => r.memberId).sort()).toEqual(["u1", "u3", "u5"]);
  });

  it("derives online for a member whose mock isOnline is true", async () => {
    const repo = makeRepo();
    const res = await repo.getPresence(["u1"]); // u1 isOnline: true
    if (!res.ok) throw new Error("expected ok");
    expect(res.value[0]?.presence).toBe("online");
    expect(res.value[0]?.lastActiveAt).toBe(new Date(NOW).toISOString());
  });

  it("splits offline members deterministically into recent/offline by id hash", async () => {
    const repo = makeRepo();
    const res = await repo.getPresence(["u2", "u5"]); // both isOnline: false
    if (!res.ok) throw new Error("expected ok");
    for (const rec of res.value) {
      expect(["recent", "offline"]).toContain(rec.presence);
    }
    // Both recent/offline buckets should be reachable across the fixture set.
    const all = await makeRepo().getPresence(["u2", "u5", "u-l1", "u-tt"]);
    if (!all.ok) throw new Error("expected ok");
    const states = new Set(all.value.map((r) => r.presence));
    expect(states.has("recent") || states.has("offline")).toBe(true);
  });

  it("is deterministic — same input yields the same output across calls", async () => {
    const a = await makeRepo().getPresence(["u1", "u2", "u5"]);
    const b = await makeRepo().getPresence(["u1", "u2", "u5"]);
    if (!a.ok || !b.ok) throw new Error("expected ok");
    expect(a.value).toEqual(b.value);
  });

  it("omits unknown member ids (missing-record = presentation-layer concern)", async () => {
    const repo = makeRepo();
    const res = await repo.getPresence(["u1", "does-not-exist"]);
    if (!res.ok) throw new Error("expected ok");
    expect(res.value.map((r) => r.memberId)).toEqual(["u1"]);
  });

  it("exercises all three states across the fixture set", async () => {
    const repo = makeRepo();
    // Include online + a spread of offline ids so both recent & offline appear.
    const res = await repo.getPresence([
      "u1",
      "u2",
      "u5",
      "u-l1",
      "u-tt",
      "u3",
      "u4",
    ]);
    if (!res.ok) throw new Error("expected ok");
    const states = new Set(res.value.map((r) => r.presence));
    expect(states.has("online")).toBe(true);
    expect(states.has("recent")).toBe(true);
    expect(states.has("offline")).toBe(true);
  });
});
