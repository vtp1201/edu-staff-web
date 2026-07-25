/**
 * Unit tests — admin parent-links Server Actions (US-E20.1, HIGH-RISK).
 * Guards are mocked at the module boundary; DI use-cases are also mocked.
 *
 * The load-bearing assertion (AC-006.2/.3): a non-admin caller is rejected with
 * `{ ok:false, errorKey:"forbidden" }` and ZERO repository/use-case calls are
 * made — proving the `requireRole` guard short-circuits BEFORE any DI wiring
 * (belt-and-suspenders alongside the repository's own tenant re-check).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: vi.fn(),
}));

// vi.hoisted so the mock factory can reference these without a TDZ error
// (vi.mock is hoisted above plain top-level consts).
const h = vi.hoisted(() => {
  const createExecute = vi.fn();
  const unlinkExecute = vi.fn();
  const auditExecute = vi.fn();
  return {
    createExecute,
    unlinkExecute,
    auditExecute,
    makeAuditUC: vi.fn(async () => ({ execute: auditExecute })),
    makeAuthCtx: vi.fn(async () => ({
      role: "admin",
      tenantId: "tenant-acme",
    })),
    makeCreateUC: vi.fn(async () => ({ execute: createExecute })),
    makeUnlinkUC: vi.fn(async () => ({ execute: unlinkExecute })),
  };
});

vi.mock("@/bootstrap/di/parent-student-link.di", () => ({
  makeParentLinksAuthContext: h.makeAuthCtx,
  makeCreateParentStudentLinkUseCase: h.makeCreateUC,
  makeUnlinkParentStudentLinkUseCase: h.makeUnlinkUC,
  makeListParentStudentLinksUseCase: vi.fn(),
  makeGetLinkConsentDetailUseCase: vi.fn(),
  makeGetLinkAuditTrailUseCase: h.makeAuditUC,
  makeSearchStudentCandidatesUseCase: vi.fn(),
  makeSearchParentCandidatesUseCase: vi.fn(),
}));

import { requireRole } from "@/bootstrap/auth-guard";
import {
  fail,
  ok,
} from "@/features/admin/parent-links/domain/use-cases/result";
import {
  createLinkAction,
  getLinkAuditTrailAction,
  unlinkLinkAction,
} from "./actions";

const mockRequireRole = vi.mocked(requireRole);
const { createExecute, unlinkExecute, auditExecute } = h;
const makeAuditUC = h.makeAuditUC;
const makeAuthCtx = h.makeAuthCtx;
const makeCreateUC = h.makeCreateUC;
const makeUnlinkUC = h.makeUnlinkUC;

const validInput = {
  studentId: "st7",
  parentId: "pa1",
  relationship: "father" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("unlinkLinkAction — RBAC short-circuit (AC-006.3)", () => {
  it("returns forbidden with ZERO repo/use-case calls when the guard fails", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });

    const res = await unlinkLinkAction("l1");

    expect(res).toEqual({ ok: false, errorKey: "forbidden", retryable: false });
    // No DI factory, no authCtx assembly, no repository/use-case call at all.
    expect(makeUnlinkUC).not.toHaveBeenCalled();
    expect(makeAuthCtx).not.toHaveBeenCalled();
    expect(unlinkExecute).not.toHaveBeenCalled();
  });

  it("passes authCtx into the use-case and maps ok → { ok:true, data:undefined }", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    unlinkExecute.mockResolvedValue(ok(undefined));

    const res = await unlinkLinkAction("l1");

    expect(res).toEqual({ ok: true, data: undefined });
    expect(makeAuthCtx).toHaveBeenCalledOnce();
    expect(unlinkExecute).toHaveBeenCalledWith("l1", {
      role: "admin",
      tenantId: "tenant-acme",
    });
  });

  it("maps a repository forbidden failure through (AC-005.6)", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    unlinkExecute.mockResolvedValue(fail({ type: "forbidden" }));

    const res = await unlinkLinkAction("l1");

    expect(res).toEqual({ ok: false, errorKey: "forbidden", retryable: false });
  });
});

describe("createLinkAction — RBAC short-circuit (AC-006.2)", () => {
  it("returns forbidden with ZERO repo/use-case calls when the guard fails", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });

    const res = await createLinkAction(validInput);

    expect(res).toEqual({ ok: false, errorKey: "forbidden", retryable: false });
    expect(makeCreateUC).not.toHaveBeenCalled();
    expect(makeAuthCtx).not.toHaveBeenCalled();
    expect(createExecute).not.toHaveBeenCalled();
  });

  it("forwards input + authCtx and returns the created link on success", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    const created = { linkId: "l-new", consentStatus: "pending" };
    createExecute.mockResolvedValue(ok(created));

    const res = await createLinkAction(validInput);

    expect(res).toEqual({ ok: true, data: created });
    expect(createExecute).toHaveBeenCalledWith(validInput, {
      role: "admin",
      tenantId: "tenant-acme",
    });
  });

  it("maps a duplicate failure to already-linked (not retryable)", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    createExecute.mockResolvedValue(fail({ type: "already-linked" }));

    const res = await createLinkAction(validInput);

    expect(res).toEqual({
      ok: false,
      errorKey: "already-linked",
      retryable: false,
      fields: undefined,
    });
  });

  it("threads validation fields through", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    createExecute.mockResolvedValue(
      fail({
        type: "validation",
        fields: [{ field: "parentId", message: "not-parent-role" }],
      }),
    );

    const res = await createLinkAction(validInput);

    expect(res).toEqual({
      ok: false,
      errorKey: "validation",
      retryable: false,
      fields: [{ field: "parentId", message: "not-parent-role" }],
    });
  });
});

describe("getLinkAuditTrailAction (US-E20.3)", () => {
  const entry = {
    entryId: "ae-1",
    linkId: "l6",
    action: "created" as const,
    actorId: "admin-1",
    actorName: "Quản trị viên demo",
    occurredAt: "2025-11-01T03:00:00.000Z",
    note: null,
  };

  it("returns forbidden with ZERO use-case calls when the guard fails", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });

    const res = await getLinkAuditTrailAction("l6");

    expect(res).toEqual({ ok: false, errorKey: "forbidden", retryable: false });
    expect(makeAuditUC).not.toHaveBeenCalled();
    expect(auditExecute).not.toHaveBeenCalled();
  });

  it("forwards linkId and returns the entries on success", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    auditExecute.mockResolvedValue(ok([entry]));

    const res = await getLinkAuditTrailAction("l6");

    expect(res).toEqual({ ok: true, data: [entry] });
    expect(auditExecute).toHaveBeenCalledWith("l6");
  });

  it("maps a network-error failure to a retryable errorKey", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    auditExecute.mockResolvedValue(fail({ type: "network-error" }));

    const res = await getLinkAuditTrailAction("l6");

    expect(res).toEqual({
      ok: false,
      errorKey: "network-error",
      retryable: true,
      fields: undefined,
    });
  });
});
