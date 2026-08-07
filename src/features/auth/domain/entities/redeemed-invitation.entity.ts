import type { AuthTokens } from "./auth-user.entity";
import type { Member } from "./member.entity";

/**
 * Result of the PUBLIC `POST /invitations/redeem` (IAM US-191, ADR 0131 D7):
 * the ACTIVE membership that was just created PLUS the tenant-scoped session
 * minted for it — equivalent to what the caller would get by signing in one
 * request later with the password they just chose. That is why redemption needs
 * no follow-up sign-in step (and no `switchTenant` round-trip, unlike the
 * authenticated accept flow).
 */
export interface RedeemedInvitation {
  member: Member;
  tokens: AuthTokens;
}
