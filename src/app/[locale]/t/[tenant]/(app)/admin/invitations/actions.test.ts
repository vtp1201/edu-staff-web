/**
 * Unit tests — admin invitations Server Actions.
 *
 * The DI factories are mocked at the module boundary; these tests own the
 * action-layer contract only: the `requireRole("admin")` gate (each action is an
 * independently-invocable POST endpoint, so the `/admin` RSC layout guard does
 * NOT cover it — ADR 0063 defense-in-depth), and domain failure → stable
 * `errorKey` (never translated copy) + the `retryable` flag the list query's
 * retry predicate consumes.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/bootstrap/auth-guard", () => ({ requireRole: vi.fn() }));

const listExecute = vi.fn();
const sendExecute = vi.fn();
const resendExecute = vi.fn();
const revokeExecute = vi.fn();

vi.mock("@/bootstrap/di/admin-invitations.di", () => ({
  makeListInvitationsUseCase: vi.fn(async () => ({ execute: listExecute })),
  makeSendInvitationBatchUseCase: vi.fn(async () => ({ execute: sendExecute })),
  makeResendInvitationUseCase: vi.fn(async () => ({ execute: resendExecute })),
  makeRevokeInvitationUseCase: vi.fn(async () => ({ execute: revokeExecute })),
}));

import { requireRole } from "@/bootstrap/auth-guard";
import {
  refreshInvitationsAction,
  resendInvitationAction,
  revokeInvitationAction,
  sendInvitationBatchAction,
} from "./actions";

const mockRequireRole = vi.mocked(requireRole);

const emptyPage = { data: [], nextCursor: null, hasMore: false };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
});

/**
 * The list is a real PII read (invitee emails + resolved inviter identity), and
 * the three mutations change tenant membership state. A non-admin caller must be
 * rejected with ZERO use-case calls — proven per action, not just on the read.
 */
describe("requireRole('admin') gates every action", () => {
  const batchInput = {
    emails: ["a@b.vn"],
    role: "teacher" as const,
    expiryDays: 7 as const,
  };

  it("refreshInvitationsAction short-circuits with no repo call", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    await expect(refreshInvitationsAction()).resolves.toEqual({
      ok: false,
      errorKey: "forbidden",
      retryable: false,
    });
    expect(listExecute).not.toHaveBeenCalled();
  });

  it("sendInvitationBatchAction short-circuits with no repo call", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    await expect(sendInvitationBatchAction(batchInput)).resolves.toEqual({
      ok: false,
      errorKey: "forbidden",
    });
    expect(sendExecute).not.toHaveBeenCalled();
  });

  it("resendInvitationAction short-circuits with no repo call", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    await expect(resendInvitationAction("inv-1")).resolves.toEqual({
      ok: false,
      errorKey: "forbidden",
    });
    expect(resendExecute).not.toHaveBeenCalled();
  });

  it("revokeInvitationAction short-circuits with no repo call", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    await expect(revokeInvitationAction("inv-1")).resolves.toEqual({
      ok: false,
      errorKey: "forbidden",
    });
    expect(revokeExecute).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated caller the same way (no repo call)", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "unauthenticated" });
    await expect(refreshInvitationsAction()).resolves.toEqual({
      ok: false,
      errorKey: "forbidden",
      retryable: false,
    });
    expect(listExecute).not.toHaveBeenCalled();
  });

  it("asks for the admin role specifically", async () => {
    listExecute.mockResolvedValue({ ok: true, value: emptyPage });
    await refreshInvitationsAction();
    expect(mockRequireRole).toHaveBeenCalledWith(["admin"]);
  });
});

describe("refreshInvitationsAction — retryable threading", () => {
  it("forwards the page on success", async () => {
    listExecute.mockResolvedValue({ ok: true, value: emptyPage });
    await expect(
      refreshInvitationsAction({ status: "expired" }),
    ).resolves.toEqual({ ok: true, data: emptyPage });
    expect(listExecute).toHaveBeenCalledWith({
      status: "expired",
      cursor: undefined,
    });
  });

  it("marks a transport failure retryable", async () => {
    listExecute.mockResolvedValue({
      ok: false,
      failure: { type: "network-error" },
    });
    await expect(refreshInvitationsAction()).resolves.toEqual({
      ok: false,
      errorKey: "network-error",
      retryable: true,
    });
  });

  it("marks a 403 NOT retryable (a verdict cannot change on retry)", async () => {
    listExecute.mockResolvedValue({
      ok: false,
      failure: { type: "forbidden" },
    });
    await expect(refreshInvitationsAction()).resolves.toEqual({
      ok: false,
      errorKey: "forbidden",
      retryable: false,
    });
  });

  it("marks a 400 invalid-request NOT retryable", async () => {
    listExecute.mockResolvedValue({
      ok: false,
      failure: { type: "invalid-request" },
    });
    await expect(refreshInvitationsAction()).resolves.toEqual({
      ok: false,
      errorKey: "invalid-request",
      retryable: false,
    });
  });
});
