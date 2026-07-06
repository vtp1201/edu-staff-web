/**
 * Unit tests — admin academic-records seal/unseal Server Actions.
 * Every action (reads included) is RBAC-gated: a non-admin caller must be
 * rejected with `forbidden` before any use-case runs (US-E14.6 revision — 6 read
 * actions were previously ungated). Guards + DI use-cases are mocked at the
 * module boundary.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: vi.fn(),
}));

const listAvailableClassesExecute = vi.fn();
const getSealStatusExecute = vi.fn();
const getAuditTrailExecute = vi.fn();
const listSealedStudentsExecute = vi.fn();
const getPendingUnsealRequestsExecute = vi.fn();
const listTenantAdminsExecute = vi.fn();
const confirmUnsealExecute = vi.fn();
const sealExecute = vi.fn();
const initiateUnsealExecute = vi.fn();

vi.mock("@/bootstrap/di/academic-records.di", () => ({
  makeListAvailableClassesUseCase: vi.fn(async () => ({
    execute: listAvailableClassesExecute,
  })),
  makeGetSealStatusUseCase: vi.fn(async () => ({
    execute: getSealStatusExecute,
  })),
  makeGetSealAuditTrailUseCase: vi.fn(async () => ({
    execute: getAuditTrailExecute,
  })),
  makeListSealedStudentsUseCase: vi.fn(async () => ({
    execute: listSealedStudentsExecute,
  })),
  makeListPendingUnsealRequestsUseCase: vi.fn(async () => ({
    execute: getPendingUnsealRequestsExecute,
  })),
  makeListTenantAdminsUseCase: vi.fn(async () => ({
    execute: listTenantAdminsExecute,
  })),
  makeConfirmUnsealUseCase: vi.fn(async () => ({
    execute: confirmUnsealExecute,
  })),
  makeInitiateUnsealUseCase: vi.fn(async () => ({
    execute: initiateUnsealExecute,
  })),
  makeSealAcademicRecordUseCase: vi.fn(async () => ({ execute: sealExecute })),
}));

vi.mock("@/bootstrap/lib/auth-token.server", () => ({
  getAccessToken: vi.fn(async () => "tok"),
}));

vi.mock("@/bootstrap/lib/jwt", () => ({
  decodeSubClaim: vi.fn(() => "admin-1"),
}));

import { requireRole } from "@/bootstrap/auth-guard";
import {
  confirmUnsealAction,
  getAuditTrailAction,
  getPendingUnsealRequestsAction,
  getSealStatusAction,
  initiateUnsealAction,
  listAvailableClassesAction,
  listSealedStudentsAction,
  listTenantAdminsAction,
  sealAction,
} from "./actions";

const mockRequireRole = vi.mocked(requireRole);

const SAMPLE_KEY = { classId: "12C1", term: "HK1" as const, year: "2025-2026" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("seal/unseal read Server Actions — RBAC guard", () => {
  it("listAvailableClassesAction rejects a non-admin before running the use-case", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    const res = await listAvailableClassesAction({
      term: "HK1",
      year: "2025-2026",
    });
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(listAvailableClassesExecute).not.toHaveBeenCalled();
  });

  it("getSealStatusAction rejects a non-admin", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "unauthenticated" });
    const res = await getSealStatusAction(SAMPLE_KEY);
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(getSealStatusExecute).not.toHaveBeenCalled();
  });

  it("getAuditTrailAction rejects a non-admin", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    const res = await getAuditTrailAction();
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(getAuditTrailExecute).not.toHaveBeenCalled();
  });

  it("listSealedStudentsAction rejects a non-admin", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    const res = await listSealedStudentsAction();
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(listSealedStudentsExecute).not.toHaveBeenCalled();
  });

  it("getPendingUnsealRequestsAction rejects a non-admin", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    const res = await getPendingUnsealRequestsAction();
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(getPendingUnsealRequestsExecute).not.toHaveBeenCalled();
  });

  it("listTenantAdminsAction rejects a non-admin", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    const res = await listTenantAdminsAction();
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(listTenantAdminsExecute).not.toHaveBeenCalled();
  });

  it("sealAction rejects a non-admin before running the use-case", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    const res = await sealAction(SAMPLE_KEY);
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(sealExecute).not.toHaveBeenCalled();
  });

  it("initiateUnsealAction rejects a non-admin before running the use-case", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    const res = await initiateUnsealAction({
      studentId: "s-1",
      classId: SAMPLE_KEY.classId,
      term: SAMPLE_KEY.term,
      year: SAMPLE_KEY.year,
      reason: "x".repeat(25),
    });
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(initiateUnsealExecute).not.toHaveBeenCalled();
  });

  it("confirmUnsealAction rejects a non-admin before running the use-case", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    const res = await confirmUnsealAction("ur-1", "admin-2");
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(confirmUnsealExecute).not.toHaveBeenCalled();
  });

  it("passes the guard and returns data for an admin", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    listAvailableClassesExecute.mockResolvedValue({
      ok: true,
      data: [{ classId: "12C1", className: "Lớp 12C1" }],
    });
    const res = await listAvailableClassesAction({
      term: "HK1",
      year: "2025-2026",
    });
    expect(res).toEqual({
      ok: true,
      data: [{ classId: "12C1", className: "Lớp 12C1" }],
    });
    expect(listAvailableClassesExecute).toHaveBeenCalledOnce();
  });
});
