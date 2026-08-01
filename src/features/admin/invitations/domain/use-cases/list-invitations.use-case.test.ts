import { describe, expect, it, vi } from "vitest";
import type { Invitation } from "../entities/invitation.entity";
import type {
  IInvitationRepository,
  InvitationsPage,
} from "../repositories/i-invitation.repository";
import { ListInvitationsUseCase } from "./list-invitations.use-case";
import { fail, ok } from "./result";

const rows: Invitation[] = [
  {
    id: "inv-1",
    email: "a@x.com",
    role: "teacher",
    status: "pending",
    invitedBy: "Admin",
    sentAt: "2026-07-01T00:00:00Z",
    expiresAt: "2026-07-15T00:00:00Z",
  },
];

const page = (over: Partial<InvitationsPage> = {}): InvitationsPage => ({
  data: rows,
  nextCursor: null,
  hasMore: false,
  ...over,
});

function repoWith(
  list: IInvitationRepository["listInvitations"],
): IInvitationRepository {
  return {
    listInvitations: list,
    sendInvitationBatch: vi.fn(),
    resendInvitation: vi.fn(),
    revokeInvitation: vi.fn(),
  };
}

describe("ListInvitationsUseCase", () => {
  it("returns the repo's invitation page on success", async () => {
    const list = vi.fn().mockResolvedValue(ok(page()));
    const result = await new ListInvitationsUseCase(repoWith(list)).execute();
    expect(result).toEqual(ok(page()));
  });

  it("forwards status/cursor/limit to the repository unchanged (real server params)", async () => {
    const list = vi.fn().mockResolvedValue(ok(page()));
    await new ListInvitationsUseCase(repoWith(list)).execute({
      status: "expired",
      cursor: "cur-1",
      limit: 25,
    });
    expect(list).toHaveBeenCalledWith({
      status: "expired",
      cursor: "cur-1",
      limit: 25,
    });
  });

  it("treats an EMPTY page as success, not an error (status=expired TTL sweep, AC-4)", async () => {
    const list = vi
      .fn()
      .mockResolvedValue(
        ok(page({ data: [], nextCursor: null, hasMore: false })),
      );
    const result = await new ListInvitationsUseCase(repoWith(list)).execute({
      status: "expired",
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.data).toEqual([]);
  });

  it("keeps a SHORT page that still reports hasMore (BE filters after a keyset read)", async () => {
    const list = vi
      .fn()
      .mockResolvedValue(
        ok(page({ data: [], nextCursor: "cur-9", hasMore: true })),
      );
    const result = await new ListInvitationsUseCase(repoWith(list)).execute({
      status: "revoked",
    });
    expect(result.ok && result.value).toEqual({
      data: [],
      nextCursor: "cur-9",
      hasMore: true,
    });
  });

  it("propagates a network failure", async () => {
    const list = vi.fn().mockResolvedValue(fail({ type: "network-error" }));
    const result = await new ListInvitationsUseCase(repoWith(list)).execute();
    expect(!result.ok && result.failure.type).toBe("network-error");
  });

  it("propagates the defensive invalid-request failure (400 malformed cursor)", async () => {
    const list = vi.fn().mockResolvedValue(fail({ type: "invalid-request" }));
    const result = await new ListInvitationsUseCase(repoWith(list)).execute({
      cursor: "garbage",
    });
    expect(!result.ok && result.failure.type).toBe("invalid-request");
  });
});
