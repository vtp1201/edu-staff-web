import { beforeEach, describe, expect, it } from "vitest";
import type { AuthContext } from "../../domain/repositories/i-parent-student-link.repository";
import {
  __resetMockParentLinks,
  MOCK_OTHER_TENANT_ID,
  MOCK_TENANT_ID,
  MockParentStudentLinkRepository,
} from "./mock-parent-student-link.repository";

const adminCtx: AuthContext = { role: "admin", tenantId: MOCK_TENANT_ID };

let repo: MockParentStudentLinkRepository;

beforeEach(() => {
  __resetMockParentLinks();
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
      { role: "teacher", tenantId: MOCK_TENANT_ID },
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
    const res = await repo.unlinkLink("l1", {
      role: "teacher",
      tenantId: MOCK_TENANT_ID,
    });
    expect(res).toEqual({ ok: false, failure: { type: "forbidden" } });

    // The link must remain — a forged role never mutates the store.
    const list = await repo.listLinks({});
    expect(list.ok && list.value.items.some((l) => l.linkId === "l1")).toBe(
      true,
    );
  });

  it("rejects unlink from a CROSS-TENANT admin → forbidden (existing link)", async () => {
    const res = await repo.unlinkLink("l1", {
      role: "admin",
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
