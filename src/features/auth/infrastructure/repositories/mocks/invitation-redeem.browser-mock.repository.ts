/**
 * Mock PUBLIC invitation repository for `NEXT_PUBLIC_USE_MOCK=true`
 * (US-E18.59, ADR 0072), replacing the deleted server-only mock.
 *
 * ── NO `import "server-only"`, and NO `Buffer` ────────────────────────────
 * Since ADR 0072 the lookup/redeem pair runs IN THE BROWSER, so its mock runs
 * there too. That rules out `bootstrap/lib/mock.ts` (a `server-only` module,
 * hence also its `USE_MOCK`/`mockDelay` exports) and rules out
 * `Buffer.from(...).toString("base64url")`, which does not exist in a browser
 * realm. Base64url is minted with `btoa` instead.
 *
 * It models the ONE behaviour that matters for this flow's correctness: an
 * invitation is SINGLE-USE. A second `redeem` with the same token is
 * `link-invalid` (410, a replay), never `account-exists` (409) — the exact
 * distinction the real BE makes and the one easiest to get wrong. `lookup` of a
 * consumed token is likewise dead, matching the real read.
 */
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

/** Browser-safe `base64url` — the replacement for `Buffer#toString("base64url")`. */
function base64Url(value: unknown): string {
  // `btoa` is Latin-1 only; the payloads minted here are ASCII JSON, and
  // `encodeURIComponent`+`unescape` would be the fix if that ever changed.
  return btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export class BrowserMockInvitationRedeemRepository
  implements IInvitationRedeemRepository
{
  /**
   * Artificial latency, injected rather than read from an env flag so tests
   * stay instant and deterministic while dev (`USE_MOCK`) still shows the new
   * client-side loading state for long enough to be seen.
   */
  constructor(private readonly latencyMs = 0) {}

  /** Tokens already consumed in this browser tab — replay detection. */
  private static readonly consumed = new Set<string>();

  /** Test/dev seam so a fresh scenario can start from a clean slate. */
  static reset(): void {
    BrowserMockInvitationRedeemRepository.consumed.clear();
  }

  private async delay(): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }
  }

  async lookup(token: string): Promise<InvitationPreview> {
    await this.delay();
    const failure = failureFor(token);
    if (failure) throw failure;
    if (BrowserMockInvitationRedeemRepository.consumed.has(token)) {
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
    await this.delay();
    const failure = failureFor(command.token);
    if (failure) throw failure;
    if (BrowserMockInvitationRedeemRepository.consumed.has(command.token)) {
      // A REPLAY is 410, not 409 — see the class comment.
      throw { type: "link-invalid" } satisfies InvitationRedeemFailure;
    }
    BrowserMockInvitationRedeemRepository.consumed.add(command.token);

    const exp = Math.floor(Date.now() / 1000) + 3600;
    const tenantId = "tenant-acme";
    const accessToken = `${base64Url({ alg: "none" })}.${base64Url({
      tenantId,
      exp,
    })}.mock`;

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
