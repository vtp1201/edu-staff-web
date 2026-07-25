import { beforeEach, describe, expect, it } from "vitest";
import type { AuthContext } from "../../domain/repositories/i-parent-student-link.repository";
import {
  __resetMockLinkAuditTrail,
  __resetMockParentLinks,
  __setMockAuditClock,
  MOCK_ACTOR_NAME,
  MOCK_OTHER_TENANT_ID,
  MOCK_TENANT_ID,
  MockParentStudentLinkRepository,
} from "./mock-parent-student-link.repository";

const adminCtx: AuthContext = {
  role: "admin",
  tenantId: MOCK_TENANT_ID,
  actorId: "admin-1",
  actorName: MOCK_ACTOR_NAME,
};

let repo: MockParentStudentLinkRepository;

beforeEach(() => {
  __resetMockParentLinks();
  __resetMockLinkAuditTrail();
  repo = new MockParentStudentLinkRepository();
});

describe("MockParentStudentLinkRepository — list", () => {
  it("returns the seeded list (≥8 links across ≥2 classes, mixed consent)", async () => {
    const res = await repo.listLinks({});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.items.length).toBeGreaterThanOrEqual(8);
    const classes = new Set(res.value.items.map((l) => l.studentClassName));
    expect(classes.size).toBeGreaterThanOrEqual(2);
    const consents = new Set(res.value.items.map((l) => l.consentStatus));
    expect(consents).toEqual(new Set(["agreed", "pending", "declined"]));
    expect(res.value.items.some((l) => l.note)).toBe(true);
  });

  it("filters by q against student OR parent name (AND with class)", async () => {
    const res = await repo.listLinks({ q: "Khoa", classId: "11A2" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.items).toHaveLength(1);
    expect(res.value.items[0].studentName).toContain("Khoa");
  });

  it("returns the filtered-empty page for a non-matching filter", async () => {
    const res = await repo.listLinks({ q: "zzz-nobody" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.items).toHaveLength(0);
    expect(res.value.hasMore).toBe(false);
  });

  it("paginates by cursor when the page limit is exceeded", async () => {
    const p1 = await repo.listLinks({ limit: 5 });
    expect(p1.ok).toBe(true);
    if (!p1.ok) return;
    expect(p1.value.items).toHaveLength(5);
    expect(p1.value.hasMore).toBe(true);
    expect(p1.value.nextCursor).toBe("5");

    const p2 = await repo.listLinks({ limit: 5, cursor: p1.value.nextCursor });
    expect(p2.ok).toBe(true);
    if (!p2.ok) return;
    expect(p2.value.items.length).toBeGreaterThanOrEqual(3);
    expect(p2.value.hasMore).toBe(false);
  });
});

describe("MockParentStudentLinkRepository — create", () => {
  it("creates a new link with consentStatus pending", async () => {
    const res = await repo.createLink(
      { studentId: "st7", parentId: "pa1", relationship: "father" },
      adminCtx,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.consentStatus).toBe("pending");
    expect(res.value.parentName).toBe("Nguyễn Văn Bình");

    const list = await repo.listLinks({});
    expect(
      list.ok && list.value.items.some((l) => l.linkId === res.value.linkId),
    ).toBe(true);
  });

  it("rejects a duplicate (studentId, parentId) pair → already-linked (FR-004)", async () => {
    const res = await repo.createLink(
      { studentId: "st1", parentId: "pa1", relationship: "father" },
      adminCtx,
    );
    expect(res).toEqual({ ok: false, failure: { type: "already-linked" } });
  });

  it("rejects a non-parent-role parentId → validation on parentId (AC-003.4)", async () => {
    const res = await repo.createLink(
      { studentId: "st7", parentId: "te-1", relationship: "father" },
      adminCtx,
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.type).toBe("validation");
    if (res.failure.type === "validation") {
      expect(res.failure.fields[0].field).toBe("parentId");
    }
  });

  it("rejects a create from a forged non-admin role → forbidden (AC-006.2)", async () => {
    const res = await repo.createLink(
      { studentId: "st7", parentId: "pa1", relationship: "father" },
      { ...adminCtx, role: "teacher" },
    );
    expect(res).toEqual({ ok: false, failure: { type: "forbidden" } });
  });
});

describe("MockParentStudentLinkRepository — unlink (HIGH-RISK, AC-005.5)", () => {
  it("unlinks an existing link for a valid admin, removing it from the list", async () => {
    const res = await repo.unlinkLink("l1", adminCtx);
    expect(res).toEqual({ ok: true, value: undefined });

    const list = await repo.listLinks({});
    expect(list.ok && list.value.items.some((l) => l.linkId === "l1")).toBe(
      false,
    );
  });

  // ── The two load-bearing forged-authCtx tests (AC-005.5) ───────────────────
  it("rejects unlink with a FORGED non-admin role → forbidden (existing link)", async () => {
    const res = await repo.unlinkLink("l1", { ...adminCtx, role: "teacher" });
    expect(res).toEqual({ ok: false, failure: { type: "forbidden" } });

    // The link must remain — a forged role never mutates the store.
    const list = await repo.listLinks({});
    expect(list.ok && list.value.items.some((l) => l.linkId === "l1")).toBe(
      true,
    );
  });

  it("rejects unlink from a CROSS-TENANT admin → forbidden (existing link)", async () => {
    const res = await repo.unlinkLink("l1", {
      ...adminCtx,
      tenantId: MOCK_OTHER_TENANT_ID,
    });
    expect(res).toEqual({ ok: false, failure: { type: "forbidden" } });

    const list = await repo.listLinks({});
    expect(list.ok && list.value.items.some((l) => l.linkId === "l1")).toBe(
      true,
    );
  });

  it("returns not-found for a missing linkId (404 race, AC-005.7)", async () => {
    const res = await repo.unlinkLink("does-not-exist", adminCtx);
    expect(res).toEqual({ ok: false, failure: { type: "not-found" } });
  });
});

describe("MockParentStudentLinkRepository — candidate search scoping (NFR-008)", () => {
  it("scopes student search to own tenant + optional class", async () => {
    const all = await repo.searchStudentCandidates("");
    expect(all.ok && all.value.length).toBeGreaterThanOrEqual(8);

    const scoped = await repo.searchStudentCandidates("", "8B1");
    expect(scoped.ok).toBe(true);
    if (!scoped.ok) return;
    expect(scoped.value.every((c) => c.className === "8B1")).toBe(true);
  });

  it("NEVER returns a cross-tenant parent or a non-parent member (NFR-008)", async () => {
    const res = await repo.searchParentCandidates("");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const ids = res.value.map((c) => c.memberId);
    expect(ids).not.toContain("pa-foreign"); // cross-tenant parent
    expect(ids).not.toContain("te-1"); // wrong role (teacher)
    expect(res.value.every((c) => c.memberId.startsWith("pa"))).toBe(true);
    expect(res.value.every((c) => c.phone)).toBe(true);
  });

  it("filters parent search by name", async () => {
    const res = await repo.searchParentCandidates("Bình");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value).toHaveLength(1);
    expect(res.value[0].fullName).toContain("Bình");
  });
});

// ── Audit trail (US-E20.3, INT-103/104/107) ──────────────────────────────────

/** Counter-backed clock → strictly increasing, fully predictable timestamps. */
function fixedClock(startHour = 0): () => string {
  let n = startHour;
  return () => `2026-01-01T${String(n++).padStart(2, "0")}:00:00.000Z`;
}

async function trailOf(repo: MockParentStudentLinkRepository, linkId: string) {
  const res = await repo.getLinkAuditTrail(linkId);
  if (!res.ok) throw new Error("expected ok");
  return res.value;
}

describe("MockParentStudentLinkRepository — getLinkAuditTrail (INT-103)", () => {
  it("returns [] for a link with no seeded history (honest empty, AC-101.2)", async () => {
    expect(await trailOf(repo, "l3")).toEqual([]);
  });

  it("returns [] for a linkId that never existed (INT-105 — never not-found)", async () => {
    expect(await trailOf(repo, "does-not-exist")).toEqual([]);
  });

  it("returns the seeded single 'created' entry for l1", async () => {
    const trail = await trailOf(repo, "l1");
    expect(trail).toHaveLength(1);
    expect(trail[0].action).toBe("created");
    expect(trail[0].linkId).toBe("l1");
    expect(trail[0].note).toBeNull();
  });

  it("returns l6's create→unlink→re-create seed newest-first (AC-101.4/UC-105)", async () => {
    const trail = await trailOf(repo, "l6");
    expect(trail.map((e) => [e.action, e.occurredAt])).toEqual([
      ["created", "2025-11-01T03:00:00.000Z"],
      ["unlinked", "2025-10-20T03:00:00.000Z"],
      ["created", "2025-10-02T02:00:00.000Z"],
    ]);
    // Note only on the newest 'created' entry; never on 'unlinked' (FR-103).
    expect(trail[0].note).toContain("Tái tạo liên kết");
    expect(trail[1].note).toBeNull();
    expect(trail[2].note).toBeNull();
  });
});

describe("MockParentStudentLinkRepository — audit emission (FR-107)", () => {
  it("records exactly ONE 'created' entry on createLink success, with the caller's actor (NFR-103)", async () => {
    __setMockAuditClock(fixedClock(9));
    const res = await repo.createLink(
      {
        studentId: "st7",
        parentId: "pa2",
        relationship: "father",
        note: "Người giám hộ mới",
      },
      adminCtx,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const trail = await trailOf(repo, res.value.linkId);
    expect(trail).toHaveLength(1);
    expect(trail[0]).toEqual({
      entryId: "ae-1",
      linkId: res.value.linkId,
      action: "created",
      actorId: adminCtx.actorId,
      actorName: adminCtx.actorName,
      occurredAt: "2026-01-01T09:00:00.000Z",
      note: "Người giám hộ mới",
    });
  });

  it("records NO entry when createLink fails with already-linked (UC-102 sc.2)", async () => {
    const before = await trailOf(repo, "l1");
    const res = await repo.createLink(
      { studentId: "st1", parentId: "pa1", relationship: "father" },
      adminCtx,
    );
    expect(res).toEqual({ ok: false, failure: { type: "already-linked" } });
    expect(await trailOf(repo, "l1")).toEqual(before);
  });

  it("records NO entry when createLink fails with validation", async () => {
    const res = await repo.createLink(
      { studentId: "st7", parentId: "te-1", relationship: "father" },
      adminCtx,
    );
    expect(res.ok).toBe(false);
    // No linkId was minted; no trail anywhere gained an entry.
    expect(await trailOf(repo, "l1")).toHaveLength(1);
  });

  it("records NO entry when createLink is rejected for a forged non-admin role", async () => {
    const res = await repo.createLink(
      { studentId: "st7", parentId: "pa1", relationship: "father" },
      { ...adminCtx, role: "teacher" },
    );
    expect(res).toEqual({ ok: false, failure: { type: "forbidden" } });
    expect(await trailOf(repo, "l1")).toHaveLength(1);
  });

  it("stores note=null when the create note is blank (UC-104 sc.2)", async () => {
    const res = await repo.createLink(
      {
        studentId: "st7",
        parentId: "pa2",
        relationship: "father",
        note: "   ",
      },
      adminCtx,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const trail = await trailOf(repo, res.value.linkId);
    expect(trail[0].note).toBeNull();
  });

  it("records exactly ONE 'unlinked' entry (note=null) on unlink success, and the trail SURVIVES the unlink (FR-108)", async () => {
    __setMockAuditClock(fixedClock(12));
    const res = await repo.unlinkLink("l1", adminCtx);
    expect(res).toEqual({ ok: true, value: undefined });

    const list = await repo.listLinks({});
    expect(list.ok && list.value.items.some((l) => l.linkId === "l1")).toBe(
      false,
    );

    const trail = await trailOf(repo, "l1");
    expect(trail).toHaveLength(2); // new 'unlinked' + the seeded 'created'
    expect(trail[0]).toEqual({
      entryId: "ae-1",
      linkId: "l1",
      action: "unlinked",
      actorId: adminCtx.actorId,
      actorName: adminCtx.actorName,
      occurredAt: "2026-01-01T12:00:00.000Z",
      note: null,
    });
  });

  it("records NO entry when unlink is rejected for a FORGED non-admin role (UC-103 sc.2)", async () => {
    const res = await repo.unlinkLink("l1", { ...adminCtx, role: "teacher" });
    expect(res).toEqual({ ok: false, failure: { type: "forbidden" } });
    expect(await trailOf(repo, "l1")).toHaveLength(1); // seed only
  });

  it("records NO entry when unlink is rejected CROSS-TENANT (UC-103 sc.3)", async () => {
    const res = await repo.unlinkLink("l1", {
      ...adminCtx,
      tenantId: MOCK_OTHER_TENANT_ID,
    });
    expect(res).toEqual({ ok: false, failure: { type: "forbidden" } });
    expect(await trailOf(repo, "l1")).toHaveLength(1);
  });

  it("records NO entry when unlink fails with not-found", async () => {
    const res = await repo.unlinkLink("does-not-exist", adminCtx);
    expect(res).toEqual({ ok: false, failure: { type: "not-found" } });
    expect(await trailOf(repo, "does-not-exist")).toEqual([]);
  });

  it("keeps a create→unlink→re-create lifecycle on ONE linkId deterministic and newest-first (UC-105)", async () => {
    __setMockAuditClock(fixedClock(1));
    const created = await repo.createLink(
      { studentId: "st7", parentId: "pa2", relationship: "father" },
      adminCtx,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const linkId = created.value.linkId;

    await repo.unlinkLink(linkId, adminCtx);
    // Re-create the SAME pair. This mock derives linkId from `Date.now()` +
    // STORE.length, so the re-created row MAY reuse the same id; the trail is
    // asserted per-id either way (an id-reuse test would be asserting that
    // pre-existing quirk, not this story's invariant).
    const recreated = await repo.createLink(
      {
        studentId: "st7",
        parentId: "pa2",
        relationship: "father",
        note: "Tạo lại",
      },
      adminCtx,
    );
    expect(recreated.ok).toBe(true);
    if (!recreated.ok) return;

    // Exact injected timestamps + ids, newest-first, on the FIRST linkId.
    const firstTrail = await trailOf(repo, linkId);
    const lifecycle = firstTrail.filter((e) => e.entryId !== "ae-3");
    expect(lifecycle).toEqual([
      {
        entryId: "ae-2",
        linkId,
        action: "unlinked",
        actorId: adminCtx.actorId,
        actorName: adminCtx.actorName,
        occurredAt: "2026-01-01T02:00:00.000Z",
        note: null,
      },
      {
        entryId: "ae-1",
        linkId,
        action: "created",
        actorId: adminCtx.actorId,
        actorName: adminCtx.actorName,
        occurredAt: "2026-01-01T01:00:00.000Z",
        note: null,
      },
    ]);

    // The re-create's own entry (ae-3) is the newest of its link's trail and
    // carries its note; the clock advanced exactly one tick.
    const recreatedTrail = await trailOf(repo, recreated.value.linkId);
    expect(recreatedTrail[0]).toMatchObject({
      entryId: "ae-3",
      action: "created",
      occurredAt: "2026-01-01T03:00:00.000Z",
      note: "Tạo lại",
    });
    // Whole trail is strictly newest-first (the unshift invariant, NFR-102).
    const stamps = recreatedTrail.map((e) => e.occurredAt);
    expect([...stamps].sort((a, b) => b.localeCompare(a))).toEqual(stamps);
  });

  it("unshifts a runtime entry ahead of the SEEDED entries for the same linkId (INT-103)", async () => {
    __setMockAuditClock(fixedClock(5));
    await repo.unlinkLink("l6", adminCtx);
    const trail = await trailOf(repo, "l6");
    expect(trail).toHaveLength(4);
    expect(trail[0].occurredAt).toBe("2026-01-01T05:00:00.000Z");
    expect(trail[0].action).toBe("unlinked");
    expect(trail[3].occurredAt).toBe("2025-10-02T02:00:00.000Z");
  });

  it("__resetMockLinkAuditTrail restores the seed, clock and id counter", async () => {
    __setMockAuditClock(fixedClock(3));
    await repo.unlinkLink("l1", adminCtx);
    expect(await trailOf(repo, "l1")).toHaveLength(2);

    __resetMockLinkAuditTrail();
    __resetMockParentLinks();
    const trail = await trailOf(repo, "l1");
    expect(trail).toHaveLength(1);
    expect(trail[0].entryId).toBe("ae-seed-l1-1");

    // Counter restarted → the next runtime entry is ae-1 again.
    __setMockAuditClock(fixedClock(4));
    await repo.unlinkLink("l1", adminCtx);
    expect((await trailOf(repo, "l1"))[0].entryId).toBe("ae-1");
  });
});

describe("MockParentStudentLinkRepository — consent detail (INT-004)", () => {
  it("returns the 3 category booleans for a link", async () => {
    const res = await repo.getLinkConsentDetail("st1", "pa1");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value).toEqual({
      studentId: "st1",
      parentId: "pa1",
      disciplineAlerts: true,
      absenceAlerts: true,
      gradeAlerts: true,
    });
  });
});
