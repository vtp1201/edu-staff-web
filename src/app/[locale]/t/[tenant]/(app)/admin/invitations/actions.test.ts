/**
 * Unit tests — admin invitations Server Actions.
 *
 * The DI factories are mocked at the module boundary; these tests own the
 * action-layer contract only: domain failure → stable `errorKey` (never
 * translated copy) + the `retryable` flag the list query's retry predicate
 * consumes.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { refreshInvitationsAction } from "./actions";

const emptyPage = { data: [], nextCursor: null, hasMore: false };

beforeEach(() => {
  vi.clearAllMocks();
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
