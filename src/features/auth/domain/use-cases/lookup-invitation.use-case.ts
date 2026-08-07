import type { InvitationPreview } from "../entities/invitation-preview.entity";
import {
  asInvitationRedeemFailure,
  type InvitationRedeemFailure,
} from "../failures/invitation-redeem.failure";
import type { IInvitationRedeemRepository } from "../repositories/i-invitation-redeem.repository";

export type LookupInvitationResult =
  | { data: InvitationPreview; error?: never }
  | { data?: never; error: InvitationRedeemFailure };

/**
 * Preview an invitation for an unauthenticated token holder (IAM US-191,
 * ADR 0131 D10) so the redemption screen can name the school, the roles and the
 * invited email instead of rendering a blind password form.
 *
 * The blank-token short-circuit fires with ZERO network call: a malformed link
 * is not worth a request, and lookup shares its per-IP rate-limit budget with
 * redeem — spending a slot on an obviously dead token would make the real
 * attempt fail for a reason the visitor cannot understand.
 */
export class LookupInvitationUseCase {
  constructor(private readonly repo: IInvitationRedeemRepository) {}

  async execute(token: string): Promise<LookupInvitationResult> {
    if (!token.trim()) return { error: { type: "link-invalid" } };
    try {
      return { data: await this.repo.lookup(token) };
    } catch (err) {
      return { error: asInvitationRedeemFailure(err) };
    }
  }
}
