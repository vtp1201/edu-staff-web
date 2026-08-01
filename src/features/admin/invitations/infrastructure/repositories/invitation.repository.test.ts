import { describe, expect, it, vi } from "vitest";
import type { Invitation as AuthInvitation } from "@/features/auth/domain/entities/invitation.entity";
import type { IamMemberFailure } from "@/features/auth/domain/failures/iam-member.failure";
import type {
  InvitationsPage as AuthInvitationsPage,
  IIamMemberRepository,
} from "@/features/auth/domain/repositories/i-iam-member.repository";
import {
  InvitationRepository,
  type ResolveDisplayNames,
} from "./invitation.repository";

const TENANT = "tenant-acme";

/** Identity resolver — the mock-mode wiring (`invitedBy` is already a name). */
const identityNames: ResolveDisplayNames = async (ids) =>
  new Map(ids.map((id) => [id, id]));

function stubIam(over: Partial<IIamMemberRepository>): IIamMemberRepository {
  return {
    listMyTenants: vi.fn(),
    switchTenant: vi.fn(),
    inviteMember: vi.fn().mockResolvedValue(undefined),
    revokeInvitation: vi.fn().mockResolvedValue(undefined),
    addMember: vi.fn(),
    changeRoles: vi.fn(),
    removeMember: vi.fn(),
    acceptInvitation: vi.fn(),
    listInvitations: vi
      .fn()
      .mockResolvedValue({ data: [], nextCursor: null, hasMore: false }),
    resendInvitation: vi.fn(),
    ...over,
  };
}

const authRow = (over: Partial<AuthInvitation> = {}): AuthInvitation => ({
  invitationId: "inv-4",
  email: "van.minh@email.com",
  roles: ["teacher"],
  status: "pending",
  invitedBy: "user-77",
  createdAt: "2026-07-18T00:00:00Z",
  expiresAt: "2026-08-01T00:00:00Z",
  ...over,
});

const authPage = (
  data: AuthInvitation[],
  over: Partial<AuthInvitationsPage> = {},
): AuthInvitationsPage => ({
  data,
  nextCursor: null,
  hasMore: false,
  ...over,
});

function makeRepo(
  over: Partial<IIamMemberRepository> = {},
  resolveNames: ResolveDisplayNames = identityNames,
) {
  const iam = stubIam(over);
  return { iam, repo: new InvitationRepository(iam, TENANT, resolveNames) };
}

describe("InvitationRepository — send/revoke (US-E21.1, unchanged)", () => {
  it("sendInvitationBatch fans out N single-email inviteMember calls with the uppercased wire role", async () => {
    const inviteMember = vi.fn().mockResolvedValue(undefined);
    const { repo } = makeRepo({ inviteMember });

    const result = await repo.sendInvitationBatch({
      emails: ["a@x.com", "b@x.com"],
      role: "manager",
      expiryDays: 14,
    });

    expect(inviteMember).toHaveBeenCalledTimes(2);
    expect(inviteMember).toHaveBeenCalledWith(TENANT, {
      email: "a@x.com",
      roles: ["MANAGER"],
    });
    expect(result.ok && result.value.succeeded).toHaveLength(2);
    expect(result.ok && result.value.failed).toHaveLength(0);
  });

  it("sendInvitationBatch splits succeeded/failed on a mixed allSettled result (partial)", async () => {
    const inviteMember = vi
      .fn()
      .mockResolvedValueOnce(undefined) // a@x.com ok
      .mockRejectedValueOnce({
        type: "invitation-invalid",
      } satisfies IamMemberFailure); // b@x.com duplicate-fails
    const { repo } = makeRepo({ inviteMember });

    const result = await repo.sendInvitationBatch({
      emails: ["a@x.com", "b@x.com"],
      role: "teacher",
      expiryDays: 14,
    });

    expect(result.ok && result.value.succeeded.map((s) => s.email)).toEqual([
      "a@x.com",
    ]);
    expect(result.ok && result.value.failed).toEqual([
      { email: "b@x.com", failure: { type: "invitation-invalid" } },
    ]);
  });

  it("revokeInvitation maps a thrown invitation_invalid → invitation-invalid (ground-truth #6)", async () => {
    const revokeInvitation = vi.fn().mockRejectedValue({
      type: "invitation-invalid",
    } satisfies IamMemberFailure);
    const { repo } = makeRepo({ revokeInvitation });

    const result = await repo.revokeInvitation("inv-1");
    expect(revokeInvitation).toHaveBeenCalledWith(TENANT, "inv-1");
    expect(!result.ok && result.failure).toEqual({
      type: "invitation-invalid",
    });
  });

  it("revokeInvitation resolves ok on success", async () => {
    const { repo } = makeRepo();
    const result = await repo.revokeInvitation("inv-1");
    expect(result.ok).toBe(true);
  });
});

describe("InvitationRepository.listInvitations (US-E18.29, real cursor page)", () => {
  it("forwards the server params and returns the mapped page", async () => {
    const listInvitations = vi
      .fn()
      .mockResolvedValue(
        authPage([authRow()], { nextCursor: "cur-2", hasMore: true }),
      );
    const { repo } = makeRepo({ listInvitations });

    const result = await repo.listInvitations({
      status: "pending",
      cursor: "cur-1",
      limit: 25,
    });

    expect(listInvitations).toHaveBeenCalledWith(TENANT, {
      status: "pending",
      cursor: "cur-1",
      limit: 25,
    });
    expect(result.ok && result.value).toEqual({
      data: [
        {
          id: "inv-4",
          email: "van.minh@email.com",
          role: "teacher",
          status: "pending",
          invitedBy: "user-77", // identity resolver → unchanged (mock mode)
          sentAt: "2026-07-18T00:00:00Z",
          expiresAt: "2026-08-01T00:00:00Z",
        },
      ],
      nextCursor: "cur-2",
      hasMore: true,
    });
  });

  it("resolves each invitedBy userId to a display name via the injected resolver", async () => {
    const listInvitations = vi
      .fn()
      .mockResolvedValue(
        authPage([
          authRow(),
          authRow({ invitationId: "inv-5", invitedBy: "user-88" }),
          authRow({ invitationId: "inv-6", invitedBy: "user-77" }),
        ]),
      );
    const resolveNames = vi.fn().mockResolvedValue(
      new Map([
        ["user-77", "Trần Minh Quân"],
        ["user-88", "Nguyễn Thị Hương"],
      ]),
    );
    const { repo } = makeRepo({ listInvitations }, resolveNames);

    const result = await repo.listInvitations();

    // One batch call for the UNIQUE ids only (2, not 3).
    expect(resolveNames).toHaveBeenCalledTimes(1);
    expect(resolveNames.mock.calls[0][0].sort()).toEqual([
      "user-77",
      "user-88",
    ]);
    expect(result.ok && result.value.data.map((r) => r.invitedBy)).toEqual([
      "Trần Minh Quân",
      "Nguyễn Thị Hương",
      "Trần Minh Quân",
    ]);
  });

  it("blanks an invitedBy the batch lookup omitted — never leaks a raw UUID (AC-3)", async () => {
    const listInvitations = vi
      .fn()
      .mockResolvedValue(authPage([authRow({ invitedBy: "user-ghost" })]));
    const { repo } = makeRepo({ listInvitations }, async () => new Map());

    const result = await repo.listInvitations();
    expect(result.ok && result.value.data[0].invitedBy).toBe("");
  });

  it("a resolver FAILURE never fails the whole list — rows still render (AC-3 secondary failure)", async () => {
    const listInvitations = vi
      .fn()
      .mockResolvedValue(authPage([authRow({ invitedBy: "user-77" })]));
    const resolveNames = vi.fn().mockRejectedValue(new Error("iam 403"));
    const { repo } = makeRepo({ listInvitations }, resolveNames);

    const result = await repo.listInvitations();
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.data).toHaveLength(1);
    expect(result.ok && result.value.data[0].invitedBy).toBe("");
  });

  it("skips the resolver entirely for an empty page (no wasted batch call)", async () => {
    const listInvitations = vi.fn().mockResolvedValue(authPage([]));
    const resolveNames = vi.fn().mockResolvedValue(new Map());
    const { repo } = makeRepo({ listInvitations }, resolveNames);

    const result = await repo.listInvitations({ status: "expired" });
    expect(resolveNames).not.toHaveBeenCalled();
    expect(result.ok && result.value).toEqual({
      data: [],
      nextCursor: null,
      hasMore: false,
    });
  });

  it("maps a thrown list failure (403 forbidden / 400 invalid-request)", async () => {
    const forbidden = makeRepo({
      listInvitations: vi
        .fn()
        .mockRejectedValue({ type: "forbidden" } satisfies IamMemberFailure),
    });
    expect(!(await forbidden.repo.listInvitations()).ok).toBe(true);

    const badParams = makeRepo({
      listInvitations: vi.fn().mockRejectedValue({
        type: "invalid-request",
      } satisfies IamMemberFailure),
    });
    const result = await badParams.repo.listInvitations({ cursor: "garbage" });
    expect(!result.ok && result.failure).toEqual({ type: "invalid-request" });
  });
});

describe("InvitationRepository.resendInvitation (US-E18.29, real POST)", () => {
  it("returns the refreshed row with its invitedBy resolved to a display name", async () => {
    const resendInvitation = vi
      .fn()
      .mockResolvedValue(authRow({ status: "pending" }));
    const { repo } = makeRepo(
      { resendInvitation },
      async () => new Map([["user-77", "Trần Minh Quân"]]),
    );

    const result = await repo.resendInvitation("inv-4");
    expect(resendInvitation).toHaveBeenCalledWith(TENANT, "inv-4");
    expect(result.ok && result.value.status).toBe("pending");
    expect(result.ok && result.value.invitedBy).toBe("Trần Minh Quân");
  });

  it("maps a race rejection to invitation-invalid (410 TTL-swept)", async () => {
    const { repo } = makeRepo({
      resendInvitation: vi.fn().mockRejectedValue({
        type: "invitation-invalid",
      } satisfies IamMemberFailure),
    });
    const result = await repo.resendInvitation("inv-4");
    expect(!result.ok && result.failure).toEqual({
      type: "invitation-invalid",
    });
  });

  it("maps 409 invitation-not-resendable 1:1 (distinct from the 410 race)", async () => {
    const { repo } = makeRepo({
      resendInvitation: vi.fn().mockRejectedValue({
        type: "invitation-not-resendable",
      } satisfies IamMemberFailure),
    });
    const result = await repo.resendInvitation("inv-3");
    expect(!result.ok && result.failure).toEqual({
      type: "invitation-not-resendable",
    });
  });

  it("carries retryAfterSeconds through the 429 rate-limited failure", async () => {
    const { repo } = makeRepo({
      resendInvitation: vi.fn().mockRejectedValue({
        type: "rate-limited",
        retryAfterSeconds: 900,
      } satisfies IamMemberFailure),
    });
    const result = await repo.resendInvitation("inv-4");
    expect(!result.ok && result.failure).toEqual({
      type: "rate-limited",
      retryAfterSeconds: 900,
    });
  });
});
