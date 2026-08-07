import type { RedeemedInvitation } from "../entities/redeemed-invitation.entity";
import {
  asInvitationRedeemFailure,
  type InvitationFieldIssue,
  type InvitationRedeemFailure,
} from "../failures/invitation-redeem.failure";
import type {
  IInvitationRedeemRepository,
  RedeemInvitationCommand,
} from "../repositories/i-invitation-redeem.repository";

export type RedeemInvitationResult =
  | { data: RedeemedInvitation; error?: never }
  | { data?: never; error: InvitationRedeemFailure };

/**
 * Password bounds mirrored from IAM's own policy
 * (`services/iam/internal/user/core/domain/service/password_policy.go`):
 * `[8, 72]` BYTES — 72 is bcrypt's hard input limit, beyond which the tail is
 * silently truncated. The composition rules (letter + digit + special) are NOT
 * re-implemented here: BE owns that policy and answers `USER_WEAK_PASSWORD`,
 * which this flow surfaces as `passwordWeak`. Duplicating it client-side would
 * create a second policy to keep in sync.
 */
const PASSWORD_MIN_BYTES = 8;
const PASSWORD_MAX_BYTES = 72;
/** `RedeemInvitationRequest.fullName` — `validate:"required,max=128"`. */
const FULL_NAME_MAX = 128;

const byteLength = (s: string): number => new TextEncoder().encode(s).length;

/**
 * Redeem an invitation as a NEW user: create the account, join the tenant, and
 * receive a tenant-scoped session in ONE request (IAM US-191, ADR 0130/0131).
 * This reverses ADR 0059's "signed-in join only" premise, which held because BE
 * had no such capability.
 *
 * The client-side guards below are defense-in-depth ONLY — BE's 422 /
 * `USER_WEAK_PASSWORD` is the authority. Their purpose is to keep obviously
 * unusable input from spending one of the visitor's ~10 shared (lookup+redeem)
 * per-IP rate-limit slots. They report EVERY offending field at once so a user
 * does not discover the next problem one round-trip at a time.
 */
export class RedeemInvitationUseCase {
  constructor(private readonly repo: IInvitationRedeemRepository) {}

  async execute(
    command: RedeemInvitationCommand,
  ): Promise<RedeemInvitationResult> {
    const token = command.token;
    // The token is not something the visitor can fix in the form — a blank one
    // is a broken LINK, so it reports as such rather than as a field error.
    if (!token.trim()) return { error: { type: "link-invalid" } };

    // Never trimmed: whitespace is a legitimate password character, and
    // trimming would silently change the credential the account is created with.
    const password = command.password;
    const fullName = command.fullName.trim();

    const issues: InvitationFieldIssue[] = [];
    if (password.length === 0) issues.push("passwordRequired");
    else if (byteLength(password) < PASSWORD_MIN_BYTES)
      issues.push("passwordTooShort");
    else if (byteLength(password) > PASSWORD_MAX_BYTES)
      issues.push("passwordTooLong");

    if (fullName.length === 0) issues.push("fullNameRequired");
    else if (fullName.length > FULL_NAME_MAX) issues.push("fullNameTooLong");

    if (issues.length > 0) return { error: { type: "invalid-input", issues } };

    try {
      return { data: await this.repo.redeem({ token, password, fullName }) };
    } catch (err) {
      return { error: asInvitationRedeemFailure(err) };
    }
  }
}
