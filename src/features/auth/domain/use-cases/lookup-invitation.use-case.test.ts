/**
 * Unit tests — `LookupInvitationUseCase` (US-E18.53, IAM US-191 / ADR 0131 D10).
 * The preview call is PUBLIC and unauthenticated, so the only client-side
 * guard worth having is the blank-token short-circuit (zero network for a
 * malformed link). Every other outcome is the repository's typed failure,
 * surfaced unchanged as a discriminated result.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InvitationPreview } from "../entities/invitation-preview.entity";
import type { IInvitationRedeemRepository } from "../repositories/i-invitation-redeem.repository";
import { LookupInvitationUseCase } from "./lookup-invitation.use-case";

const lookup = vi.fn();
const redeem = vi.fn();
const repo = { lookup, redeem } satisfies IInvitationRedeemRepository;

const PREVIEW: InvitationPreview = {
  email: "lan.pham@nguyendu.edu.vn",
  tenantName: "THPT Nguyễn Du",
  roles: ["TEACHER"],
  expiresAt: "2026-08-14T02:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LookupInvitationUseCase", () => {
  it("returns the preview for a valid token", async () => {
    lookup.mockResolvedValue(PREVIEW);
    const result = await new LookupInvitationUseCase(repo).execute("tok-1");
    expect(result).toEqual({ data: PREVIEW });
    expect(lookup).toHaveBeenCalledWith("tok-1");
  });

  it.each([
    "",
    "   ",
  ])("blank token %p short-circuits to link-invalid with ZERO network call", async (token) => {
    const result = await new LookupInvitationUseCase(repo).execute(token);
    expect(result).toEqual({ error: { type: "link-invalid" } });
    expect(lookup).not.toHaveBeenCalled();
  });

  it("surfaces the repository's typed failure unchanged (410 expired stays distinct from 410 invalid)", async () => {
    lookup.mockRejectedValue({ type: "link-expired" });
    const result = await new LookupInvitationUseCase(repo).execute("tok-1");
    expect(result).toEqual({ error: { type: "link-expired" } });
  });

  it("surfaces the 429 rate-limit failure (shared budget with redeem)", async () => {
    lookup.mockRejectedValue({ type: "rate-limited", retryAfterSeconds: 60 });
    const result = await new LookupInvitationUseCase(repo).execute("tok-1");
    expect(result).toEqual({
      error: { type: "rate-limited", retryAfterSeconds: 60 },
    });
  });

  it("a non-failure throw (a bug, not a mapped failure) degrades to unknown rather than leaking the raw error", async () => {
    lookup.mockRejectedValue(new Error("boom"));
    const result = await new LookupInvitationUseCase(repo).execute("tok-1");
    expect(result).toEqual({ error: { type: "unknown" } });
  });
});
