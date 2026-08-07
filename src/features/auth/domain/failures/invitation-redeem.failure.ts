/**
 * Typed failure union for the PUBLIC invitation lookup/redeem flow (US-E18.53,
 * IAM US-191 / ADR 0130/0131).
 *
 * Kept SEPARATE from {@link IamMemberFailure} on purpose: that union serves the
 * authenticated member/invitation surface (403 email-mismatch, last-admin,
 * not-resendable…), none of which an unauthenticated redeemer can hit, while
 * these three — `account-exists`, `invalid-input`, `rate-limited` — exist only
 * here. Collapsing them would force every consumer of either surface to handle
 * states it can never see.
 *
 * The distinction that matters most to the user (and the one easiest to get
 * wrong): a REPLAYED token — a second redeem with an already-consumed
 * invitation — is `link-invalid` (BE 410 Gone), NOT `account-exists` (409).
 * They mean opposite things: "this link is dead, ask for a new one" vs "you
 * already have an account, sign in instead".
 */

/**
 * A per-field problem with the redemption form. A closed literal union (not a
 * free-form server string) so the copy is translatable and a new BE field can
 * never render an untranslated raw message.
 */
export type InvitationFieldIssue =
  | "passwordRequired"
  | "passwordTooShort"
  | "passwordTooLong"
  | "passwordWeak"
  | "passwordInvalid"
  | "fullNameRequired"
  | "fullNameTooLong"
  | "fullNameInvalid";

export type InvitationRedeemFailure =
  /** 410 Gone — unknown, revoked, already-used or REPLAYED token (`INVITATION_INVALID`). */
  | { type: "link-invalid" }
  /** 410 Gone — the invitation passed its expiry (`INVITATION_EXPIRED`). */
  | { type: "link-expired" }
  /** 409 — the invited email already has an account (`INVITATION_ACCOUNT_EXISTS`).
   *  Nothing was written and the password was NEVER applied to that account; the
   *  invitation stays PENDING, so the signed-in accept flow still works. */
  | { type: "account-exists" }
  /** 422 `VALIDATION_FAILED` / 400 `USER_WEAK_PASSWORD`, or a client-side guard. */
  | { type: "invalid-input"; issues: InvitationFieldIssue[] }
  /** 429 — per-IP budget SHARED between lookup and redeem (`RATE_LIMIT_EXCEEDED`). */
  | { type: "rate-limited"; retryAfterSeconds?: number }
  /** 403 `FORBIDDEN_ACTION` — the inviting tenant is not ACTIVE. */
  | { type: "tenant-inactive" }
  | { type: "network-error" }
  | { type: "unknown" };

const KNOWN_TYPES: ReadonlySet<string> = new Set<
  InvitationRedeemFailure["type"]
>([
  "link-invalid",
  "link-expired",
  "account-exists",
  "invalid-input",
  "rate-limited",
  "tenant-inactive",
  "network-error",
  "unknown",
]);

/**
 * Narrow a thrown value to a mapped {@link InvitationRedeemFailure}. The
 * repository maps every API error before throwing, so anything else reaching a
 * use-case is a genuine bug (or a framework error) — degrade it to `unknown`
 * rather than leaking a raw `Error`/`ApiError` across the domain boundary.
 */
export function asInvitationRedeemFailure(
  err: unknown,
): InvitationRedeemFailure {
  if (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { type?: unknown }).type === "string" &&
    KNOWN_TYPES.has((err as { type: string }).type)
  ) {
    return err as InvitationRedeemFailure;
  }
  return { type: "unknown" };
}
