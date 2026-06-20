/**
 * Unit tests — admin grades/approval Server Actions.
 * Guards are mocked at the module boundary; DI use-cases are also mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the require-role guard
vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: vi.fn(),
}));

// Mock the DI factories
const approveExecute = vi.fn();
const requestRevisionExecute = vi.fn();
const bulkLockExecute = vi.fn();

vi.mock("@/bootstrap/di/grades.di", () => ({
  makeApproveGradeBatchUseCase: vi.fn(async () => ({
    execute: approveExecute,
  })),
  makeRequestGradeRevisionUseCase: vi.fn(async () => ({
    execute: requestRevisionExecute,
  })),
  makeBulkLockBatchesUseCase: vi.fn(async () => ({ execute: bulkLockExecute })),
  makeGradeApprovalRepository: vi.fn(async () => ({
    listApprovalBatches: vi.fn(),
    getBatchDetail: vi.fn(),
  })),
}));

import { requireRole } from "@/bootstrap/auth-guard";
import {
  approveGradeBatchAction,
  bulkLockBatchesAction,
  requestGradeRevisionAction,
} from "./actions";

const mockRequireRole = vi.mocked(requireRole);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("approveGradeBatchAction", () => {
  it("returns forbidden when guard fails", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    const res = await approveGradeBatchAction("batch-001");
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(approveExecute).not.toHaveBeenCalled();
  });

  it("returns ok with data on success", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    const mockBatch = { id: "batch-001", status: "approved" };
    approveExecute.mockResolvedValue(mockBatch);
    const res = await approveGradeBatchAction("batch-001");
    expect(res).toEqual({ ok: true, data: mockBatch });
  });

  it("returns errorKey when use-case throws", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    approveExecute.mockRejectedValue({ type: "not-pending-approval" });
    const res = await approveGradeBatchAction("batch-001");
    expect(res).toEqual({ ok: false, errorKey: "not-pending-approval" });
  });
});

describe("requestGradeRevisionAction", () => {
  it("returns forbidden when guard fails", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "unauthenticated" });
    const res = await requestGradeRevisionAction("batch-001", "note");
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(requestRevisionExecute).not.toHaveBeenCalled();
  });

  it("returns ok with data on success", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    const mockBatch = { id: "batch-001", status: "revision-requested" };
    requestRevisionExecute.mockResolvedValue(mockBatch);
    const res = await requestGradeRevisionAction(
      "batch-001",
      "needs correction",
    );
    expect(res).toEqual({ ok: true, data: mockBatch });
  });
});

describe("bulkLockBatchesAction", () => {
  it("returns forbidden when guard fails", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    const res = await bulkLockBatchesAction(["b1", "b2"]);
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(bulkLockExecute).not.toHaveBeenCalled();
  });

  it("returns ok with data on success", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    const mockBatches = [{ id: "b1" }, { id: "b2" }];
    bulkLockExecute.mockResolvedValue(mockBatches);
    const res = await bulkLockBatchesAction(["b1", "b2"]);
    expect(res).toEqual({ ok: true, data: mockBatches });
  });
});
