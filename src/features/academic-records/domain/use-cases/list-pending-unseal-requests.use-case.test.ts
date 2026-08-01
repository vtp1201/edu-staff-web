import { describe, expect, it } from "vitest";
import type { UnsealRequestSummary } from "../entities/seal-batch.entity";
import type { IAcademicRecordsSealRepository } from "../repositories/i-academic-records-seal.repository";
import { ListPendingUnsealRequestsUseCase } from "./list-pending-unseal-requests.use-case";

const SUMMARY: UnsealRequestSummary = {
  requestId: "ur-1",
  classId: "12C1",
  termId: "HK1",
  studentMemberId: "m-1",
  studentName: "Phạm Hữu Phúc",
  requestedBy: "admin-1",
  requestedByName: "Trần Minh Quân",
  reason: "x".repeat(25),
  status: "PENDING",
  createdAt: "2026-02-19T10:22:00.000Z",
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
      data: { items: [SUMMARY], nextCursor: null, hasMore: false },
    }),
    initiateUnseal: async () => ({ ok: false, error: { type: "unknown" } }),
    confirmUnseal: async () => ({ ok: false, error: { type: "unknown" } }),
    listTenantAdmins: async () => ({ ok: true, data: [] }),
    ...overrides,
  };
}

describe("ListPendingUnsealRequestsUseCase", () => {
  it("forwards (classId, termId, opts) verbatim to the repository", async () => {
    const received: unknown[] = [];
    const repo = makeRepo({
      getPendingUnsealRequests: async (classId, termId, opts) => {
        received.push(classId, termId, opts);
        return {
          ok: true,
          data: { items: [SUMMARY], nextCursor: "c2", hasMore: true },
        };
      },
    });

    const result = await new ListPendingUnsealRequestsUseCase(repo).execute(
      "12C1",
      "HK1",
      { status: "PENDING", cursor: "c1", limit: 20 },
    );

    expect(received).toEqual([
      "12C1",
      "HK1",
      { status: "PENDING", cursor: "c1", limit: 20 },
    ]);
    expect(result).toEqual({
      ok: true,
      data: { items: [SUMMARY], nextCursor: "c2", hasMore: true },
    });
  });

  it("omits opts when the caller passes none (repo default applies)", async () => {
    let receivedOpts: unknown = "sentinel";
    const repo = makeRepo({
      getPendingUnsealRequests: async (_classId, _termId, opts) => {
        receivedOpts = opts;
        return {
          ok: true,
          data: { items: [], nextCursor: null, hasMore: false },
        };
      },
    });

    await new ListPendingUnsealRequestsUseCase(repo).execute("12C1", "HK1");
    expect(receivedOpts).toBeUndefined();
  });

  it("bubbles a repository failure unchanged", async () => {
    const repo = makeRepo({
      getPendingUnsealRequests: async () => ({
        ok: false,
        error: { type: "unseal-request-invalid-cursor" },
      }),
    });

    const result = await new ListPendingUnsealRequestsUseCase(repo).execute(
      "12C1",
      "HK1",
    );
    expect(result).toEqual({
      ok: false,
      error: { type: "unseal-request-invalid-cursor" },
    });
  });
});
