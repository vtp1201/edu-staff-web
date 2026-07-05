import { describe, expect, it } from "vitest";
import type { UnsealRequest } from "../entities/seal-batch.entity";
import type { IAcademicRecordsSealRepository } from "../repositories/i-academic-records-seal.repository";
import { ConfirmUnsealUseCase } from "./confirm-unseal.use-case";

function request(over: Partial<UnsealRequest>): UnsealRequest {
  return {
    id: "ur-1",
    studentId: "s-1",
    studentName: "Học sinh A",
    classId: "12C1",
    term: "HK1",
    year: "2025-2026",
    reason: "x".repeat(25),
    requestedById: "admin-1",
    requestedByName: "Admin 1",
    requestedAt: "2026-02-19T10:22:00.000Z",
    status: "PENDING",
    coSignerId: null,
    coSignerName: null,
    confirmedAt: null,
    selfApproved: false,
    ...over,
  };
}

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
      data: [request({})],
    }),
    initiateUnseal: async () => ({ ok: false, error: { type: "unknown" } }),
    confirmUnseal: async () => ({
      ok: true,
      data: {
        request: request({ status: "APPROVED", coSignerId: "admin-2" }),
        fallback: false,
      },
    }),
    listTenantAdmins: async () => ({ ok: true, data: [] }),
    ...overrides,
  };
}

describe("ConfirmUnsealUseCase", () => {
  it("confirms when a different admin co-signs", async () => {
    let confirmedWith: string | null | undefined;
    const repo = makeRepo({
      confirmUnseal: async (_id, coSignerId) => {
        confirmedWith = coSignerId;
        return {
          ok: true,
          data: {
            request: request({ status: "APPROVED", coSignerId: "admin-2" }),
            fallback: false,
          },
        };
      },
    });
    const result = await new ConfirmUnsealUseCase(repo).execute(
      "ur-1",
      "admin-2",
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.fallback).toBe(false);
    expect(confirmedWith).toBe("admin-2");
  });

  it("blocks same-admin-as-initiator (AC-8)", async () => {
    const repo = makeRepo({
      getPendingUnsealRequests: async () => ({
        ok: true,
        data: [request({ requestedById: "admin-1" })],
      }),
      confirmUnseal: async () => {
        throw new Error("must not confirm when same admin");
      },
    });
    const result = await new ConfirmUnsealUseCase(repo).execute(
      "ur-1",
      "admin-1",
    );
    expect(result).toEqual({
      ok: false,
      error: { type: "same-admin-as-initiator" },
    });
  });

  it("returns no-pending-request for an unknown request id", async () => {
    const repo = makeRepo({
      getPendingUnsealRequests: async () => ({ ok: true, data: [] }),
      confirmUnseal: async () => {
        throw new Error("must not confirm unknown request");
      },
    });
    const result = await new ConfirmUnsealUseCase(repo).execute(
      "ur-unknown",
      "admin-2",
    );
    expect(result).toEqual({
      ok: false,
      error: { type: "no-pending-request" },
    });
  });

  it("allows self-approve fallback (coSignerId null) and flags fallback", async () => {
    let confirmedWith: string | null | undefined = "x";
    const repo = makeRepo({
      confirmUnseal: async (_id, coSignerId) => {
        confirmedWith = coSignerId;
        return {
          ok: true,
          data: {
            request: request({ status: "APPROVED", selfApproved: true }),
            fallback: true,
          },
        };
      },
    });
    const result = await new ConfirmUnsealUseCase(repo).execute("ur-1", null);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.fallback).toBe(true);
    expect(confirmedWith).toBeNull();
  });

  it("bubbles no-pending-request from the repo (already-confirmed race)", async () => {
    const repo = makeRepo({
      confirmUnseal: async () => ({
        ok: false,
        error: { type: "no-pending-request" },
      }),
    });
    const result = await new ConfirmUnsealUseCase(repo).execute(
      "ur-1",
      "admin-2",
    );
    expect(result).toEqual({
      ok: false,
      error: { type: "no-pending-request" },
    });
  });
});
