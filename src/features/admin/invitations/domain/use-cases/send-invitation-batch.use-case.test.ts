import { describe, expect, it, vi } from "vitest";
import type { SendInvitationBatchInput } from "../entities/invitation.entity";
import type { InvitationFailure } from "../failures/invitation.failure";
import type {
  IInvitationRepository,
  SendBatchOutcome,
} from "../repositories/i-invitation.repository";
import { ok, type Result } from "./result";
import { SendInvitationBatchUseCase } from "./send-invitation-batch.use-case";

function makeRepo(outcome: Result<SendBatchOutcome, InvitationFailure>): {
  repo: IInvitationRepository;
  send: ReturnType<typeof vi.fn>;
} {
  const send = vi.fn().mockResolvedValue(outcome);
  const repo: IInvitationRepository = {
    listInvitations: vi.fn(),
    sendInvitationBatch: send,
    resendInvitation: vi.fn(),
    revokeInvitation: vi.fn(),
  };
  return { repo, send };
}

const input = (emails: string[]): SendInvitationBatchInput => ({
  emails,
  role: "teacher",
  expiryDays: 14,
});

describe("SendInvitationBatchUseCase", () => {
  it("passes the batch to the repo and returns the per-email outcome (all succeed)", async () => {
    const outcome: SendBatchOutcome = {
      succeeded: [
        { email: "a@x.com", invitationId: "i1" },
        { email: "b@x.com", invitationId: "i2" },
      ],
      failed: [],
    };
    const { repo, send } = makeRepo(ok(outcome));
    const result = await new SendInvitationBatchUseCase(repo).execute(
      input(["a@x.com", "b@x.com"]),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ emails: ["a@x.com", "b@x.com"] }),
    );
    expect(result).toEqual(ok(outcome));
  });

  it("returns the partial split untouched (some succeed, one duplicate-fails)", async () => {
    const outcome: SendBatchOutcome = {
      succeeded: [{ email: "a@x.com", invitationId: "i1" }],
      failed: [{ email: "b@x.com", failure: { type: "invitation-invalid" } }],
    };
    const { repo } = makeRepo(ok(outcome));
    const result = await new SendInvitationBatchUseCase(repo).execute(
      input(["a@x.com", "b@x.com"]),
    );
    expect(result.ok && result.value.succeeded).toHaveLength(1);
    expect(result.ok && result.value.failed).toHaveLength(1);
  });

  it("dedupes case-insensitive duplicate emails within the batch before sending", async () => {
    const outcome: SendBatchOutcome = {
      succeeded: [{ email: "a@x.com", invitationId: "i1" }],
      failed: [],
    };
    const { repo, send } = makeRepo(ok(outcome));
    await new SendInvitationBatchUseCase(repo).execute(
      input(["a@x.com", "A@X.com", "  a@x.com "]),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ emails: ["a@x.com"] }),
    );
  });

  it("returns a validation failure when no email survives dedupe (never calls repo)", async () => {
    const { repo, send } = makeRepo(ok({ succeeded: [], failed: [] }));
    const result = await new SendInvitationBatchUseCase(repo).execute(
      input(["  ", ""]),
    );
    expect(send).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(!result.ok && result.failure.type).toBe("validation");
  });

  it("propagates a total network failure from the repo", async () => {
    const send = vi.fn().mockResolvedValue({
      ok: false,
      failure: { type: "network-error" },
    });
    const repo: IInvitationRepository = {
      listInvitations: vi.fn(),
      sendInvitationBatch: send,
      resendInvitation: vi.fn(),
      revokeInvitation: vi.fn(),
    };
    const result = await new SendInvitationBatchUseCase(repo).execute(
      input(["a@x.com"]),
    );
    expect(!result.ok && result.failure.type).toBe("network-error");
  });
});
