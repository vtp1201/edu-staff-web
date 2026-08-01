import { describe, expect, it } from "vitest";
import type {
  UnsealApproveResult,
  UnsealRequestSummary,
} from "../entities/seal-batch.entity";
import type { IAcademicRecordsSealRepository } from "../repositories/i-academic-records-seal.repository";
import { ConfirmUnsealUseCase } from "./confirm-unseal.use-case";

const CLASS_ID = "12C1";
const TERM_ID = "HK1";

function request(over: Partial<UnsealRequestSummary>): UnsealRequestSummary {
  return {
    requestId: "ur-1",
    classId: CLASS_ID,
    termId: TERM_ID,
    studentMemberId: "s-1",
    studentName: "Học sinh A",
    requestedBy: "admin-1",
    requestedByName: "Admin 1",
    reason: "x".repeat(25),
    status: "PENDING",
    createdAt: "2026-02-19T10:22:00.000Z",
    ...over,
  };
}

const APPROVED: UnsealApproveResult = {
  classId: CLASS_ID,
  termId: TERM_ID,
  studentMemberId: "s-1",
  status: "UNSEALED",
  selfApproved: false,
  unsealedAt: "2026-02-20T09:00:00.000Z",
};

function makeRepo(
  overrides: Partial<IAcademicRecordsSealRepository>,
): IAcademicRecordsSealRepository {
  return {
    listAvailableClasses: async () => ({ ok: true, data: [] }),
    getSealStatus: async () => ({ ok: false, error: { type: "unknown" } }),
    sealBatch: async () => ({ ok: false, error: { type: "unknown" } }),
    getSealAuditTrail: async () => ({ ok: true, data: [] }),
    listSealedStudents: async () => ({ ok: true, data: [] }),
    getPendingUnsealRequests: async () => ({
      ok: true,
      data: { items: [request({})], nextCursor: null, hasMore: false },
    }),
    initiateUnseal: async () => ({ ok: false, error: { type: "unknown" } }),
    confirmUnseal: async () => ({ ok: true, data: APPROVED }),
    listTenantAdmins: async () => ({ ok: true, data: [] }),
    ...overrides,
  };
}

describe("ConfirmUnsealUseCase", () => {
  it("confirms when a different admin co-signs (threading classId/termId)", async () => {
    const confirmArgs: unknown[] = [];
    const repo = makeRepo({
      confirmUnseal: async (id, coSignerId, classId, termId) => {
        confirmArgs.push(id, coSignerId, classId, termId);
        return { ok: true, data: APPROVED };
      },
    });
    const result = await new ConfirmUnsealUseCase(repo).execute(
      "ur-1",
      "admin-2",
      CLASS_ID,
      TERM_ID,
    );
    expect(result).toEqual({ ok: true, data: APPROVED });
    expect(confirmArgs).toEqual(["ur-1", "admin-2", CLASS_ID, TERM_ID]);
  });

  /** design-call #4 — bounded single-page pre-check, no cursor-follow. */
  it("pre-checks with a bounded PENDING page scoped to the class/term", async () => {
    const listArgs: unknown[] = [];
    const repo = makeRepo({
      getPendingUnsealRequests: async (classId, termId, opts) => {
        listArgs.push(classId, termId, opts);
        return {
          ok: true,
          data: { items: [request({})], nextCursor: "c2", hasMore: true },
        };
      },
    });
    await new ConfirmUnsealUseCase(repo).execute(
      "ur-1",
      "admin-2",
      CLASS_ID,
      TERM_ID,
    );
    expect(listArgs).toEqual([
      CLASS_ID,
      TERM_ID,
      { status: "PENDING", limit: 100 },
    ]);
  });

  it("blocks same-admin-as-initiator (AC-8)", async () => {
    const repo = makeRepo({
      getPendingUnsealRequests: async () => ({
        ok: true,
        data: {
          items: [request({ requestedBy: "admin-1" })],
          nextCursor: null,
          hasMore: false,
        },
      }),
      confirmUnseal: async () => {
        throw new Error("must not confirm when same admin");
      },
    });
    const result = await new ConfirmUnsealUseCase(repo).execute(
      "ur-1",
      "admin-1",
      CLASS_ID,
      TERM_ID,
    );
    expect(result).toEqual({
      ok: false,
      error: { type: "same-admin-as-initiator" },
    });
  });

  it("returns no-pending-request for an unknown request id", async () => {
    const repo = makeRepo({
      getPendingUnsealRequests: async () => ({
        ok: true,
        data: { items: [], nextCursor: null, hasMore: false },
      }),
      confirmUnseal: async () => {
        throw new Error("must not confirm unknown request");
      },
    });
    const result = await new ConfirmUnsealUseCase(repo).execute(
      "ur-unknown",
      "admin-2",
      CLASS_ID,
      TERM_ID,
    );
    expect(result).toEqual({
      ok: false,
      error: { type: "no-pending-request" },
    });
  });

  it("allows self-approve fallback (coSignerId null) only when the tenant has exactly 1 admin", async () => {
    let confirmedWith: string | null | undefined = "x";
    const repo = makeRepo({
      listTenantAdmins: async () => ({
        ok: true,
        data: [{ id: "admin-1", name: "Admin 1" }],
      }),
      confirmUnseal: async (_id, coSignerId) => {
        confirmedWith = coSignerId;
        return { ok: true, data: { ...APPROVED, selfApproved: true } };
      },
    });
    const result = await new ConfirmUnsealUseCase(repo).execute(
      "ur-1",
      null,
      CLASS_ID,
      TERM_ID,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.selfApproved).toBe(true);
    expect(confirmedWith).toBeNull();
  });

  it("rejects self-approve when the tenant has >= 2 admins (ADR-0037 gate, defense-in-depth)", async () => {
    const repo = makeRepo({
      listTenantAdmins: async () => ({
        ok: true,
        data: [
          { id: "admin-1", name: "Admin 1" },
          { id: "admin-2", name: "Admin 2" },
        ],
      }),
      confirmUnseal: async () => {
        throw new Error(
          "must not confirm self-approve in a multi-admin tenant",
        );
      },
    });
    const result = await new ConfirmUnsealUseCase(repo).execute(
      "ur-1",
      null,
      CLASS_ID,
      TERM_ID,
    );
    expect(result).toEqual({
      ok: false,
      error: { type: "self-approve-not-allowed" },
    });
  });

  it("bubbles unseal-request-already-approved from the repo (already-confirmed race)", async () => {
    const repo = makeRepo({
      confirmUnseal: async () => ({
        ok: false,
        error: { type: "unseal-request-already-approved" },
      }),
    });
    const result = await new ConfirmUnsealUseCase(repo).execute(
      "ur-1",
      "admin-2",
      CLASS_ID,
      TERM_ID,
    );
    expect(result).toEqual({
      ok: false,
      error: { type: "unseal-request-already-approved" },
    });
  });
});
