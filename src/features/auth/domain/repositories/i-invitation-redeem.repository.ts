import type { InvitationPreview } from "../entities/invitation-preview.entity";
import type { RedeemedInvitation } from "../entities/redeemed-invitation.entity";

/**
 * Command for `POST /invitations/redeem`. There is deliberately NO `email`
 * field (ADR 0131 D5): the account's email is the INVITATION's email, resolved
 * server-side, so a token holder can never redirect a tenant's invitation to an
 * address they control. Do not add one "for convenience".
 */
export interface RedeemInvitationCommand {
  /** Raw invitation token from the emailed link. Travels in the POST BODY only. */
  token: string;
  password: string;
  fullName: string;
}

/**
 * PUBLIC (unauthenticated) invitation port — IAM US-191.
 *
 * THROWING contract (matches `IIamMemberRepository`, the sibling this flow
 * mirrors): implementations reject with a mapped
 * `InvitationRedeemFailure`, never a raw `ApiError`. The use-cases adapt that
 * to a discriminated `{data,error}` result for Server Actions.
 */
export interface IInvitationRedeemRepository {
  /** Read-only preview. MUST NOT consume or mutate the invitation. */
  lookup(token: string): Promise<InvitationPreview>;
  /** Creates the account + ACTIVE membership and mints a tenant-scoped session. */
  redeem(command: RedeemInvitationCommand): Promise<RedeemedInvitation>;
}
