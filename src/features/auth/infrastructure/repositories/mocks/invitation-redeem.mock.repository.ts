import "server-only";
import type { InvitationPreview } from "../../../domain/entities/invitation-preview.entity";
import type { RedeemedInvitation } from "../../../domain/entities/redeemed-invitation.entity";
import type { InvitationRedeemFailure } from "../../../domain/failures/invitation-redeem.failure";
import type {
  IInvitationRedeemRepository,
  RedeemInvitationCommand,
} from "../../../domain/repositories/i-invitation-redeem.repository";

const DAY_MS = 86_400_000;

/**
 * Token substrings that drive the mock into a specific failure, so every state
 * of the public redeem screen is reachable in `NEXT_PUBLIC_USE_MOCK=true`
 * without a running IAM (decision 0014). A real invitation token is a random
 * opaque string, so these markers cannot collide with one in real mode — and
 * this class is only ever constructed behind the `USE_MOCK` gate anyway.
 */
const FAILURE_MARKERS: ReadonlyArray<[string, InvitationRedeemFailure]> = [
  ["expired", { type: "link-expired" }],
  ["used", { type: "link-invalid" }],
  ["invalid", { type: "link-invalid" }],
  ["exists", { type: "account-exists" }],
  ["limited", { type: "rate-limited", retryAfterSeconds: 60 }],
  ["inactive", { type: "tenant-inactive" }],
  ["offline", { type: "network-error" }],
];

function failureFor(token: string): InvitationRedeemFailure | null {
  const lowered = token.toLowerCase();
  return (
    FAILURE_MARKERS.find(([marker]) => lowered.includes(marker))?.[1] ?? null
  );
}

/**
 * Mock PUBLIC invitation repository (`NEXT_PUBLIC_USE_MOCK=true`).
 *
 * It models the ONE behaviour that matters for this flow's correctness: an
 * invitation is SINGLE-USE. A second `redeem` with the same token is
 * `link-invalid` (410, a replay), never `account-exists` (409) — the exact
 * distinction the real BE makes and the one easiest to get wrong. `lookup` of a
 * consumed token is likewise dead, matching the real read.
 */
export class MockInvitationRedeemRepository
  implements IInvitationRedeemRepository
{
  /** Tokens already consumed in this process — replay detection. */
  private static readonly consumed = new Set<string>();

  /** Test/dev seam so a fresh scenario can start from a clean slate. */
  static reset(): void {
    MockInvitationRedeemRepository.consumed.clear();
  }

  async lookup(token: string): Promise<InvitationPreview> {
    const failure = failureFor(token);
    if (failure) throw failure;
    if (MockInvitationRedeemRepository.consumed.has(token)) {
      throw { type: "link-invalid" } satisfies InvitationRedeemFailure;
    }
    return {
      email: "lan.pham@nguyendu.edu.vn",
      tenantName: "THPT Nguyễn Du",
      roles: ["TEACHER"],
      expiresAt: new Date(Date.now() + 3 * DAY_MS).toISOString(),
    };
  }

  async redeem(command: RedeemInvitationCommand): Promise<RedeemedInvitation> {
    const failure = failureFor(command.token);
    if (failure) throw failure;
    if (MockInvitationRedeemRepository.consumed.has(command.token)) {
      // A REPLAY is 410, not 409 — see the class comment.
      throw { type: "link-invalid" } satisfies InvitationRedeemFailure;
    }
    MockInvitationRedeemRepository.consumed.add(command.token);

    const exp = Math.floor(Date.now() / 1000) + 3600;
    const b64 = (o: unknown) =>
      Buffer.from(JSON.stringify(o)).toString("base64url");
    const tenantId = "tenant-acme";
    const accessToken = `${b64({ alg: "none" })}.${b64({ tenantId, exp })}.mock`;

    return {
      member: {
        tenantId,
        userId: "user-redeemed",
        roles: ["TEACHER"],
        status: "ACTIVE",
      },
      tokens: {
        accessToken,
        refreshToken: `mock-refresh.${tenantId}`,
        sessionId: "mock-session-redeem",
      },
    };
  }
}
