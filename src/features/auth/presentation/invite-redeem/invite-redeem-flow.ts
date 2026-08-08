/**
 * Framework-free core of the browser-direct invitation redemption
 * (US-E18.59, ADR 0072).
 *
 * Since the lookup moved from an RSC data fetch to a client `useQuery`, the
 * screen-state derivation and the submit orchestration became client code.
 * They are kept as pure functions here so they stay unit-testable (the repo's
 * vitest environment is `node`: no DOM, no hook rendering) and so the container
 * component stays a thin binding of query state to these decisions.
 */
import type { AuthTokens } from "@/features/auth/domain/entities/auth-user.entity";
import type { InvitationPreview } from "@/features/auth/domain/entities/invitation-preview.entity";
import type { Member } from "@/features/auth/domain/entities/member.entity";
import type { RedeemedInvitation } from "@/features/auth/domain/entities/redeemed-invitation.entity";
import { asInvitationRedeemFailure } from "@/features/auth/domain/failures/invitation-redeem.failure";
import type { RedeemInvitationCommand } from "@/features/auth/domain/repositories/i-invitation-redeem.repository";
import type {
  InviteRedeemVM,
  RedeemInvitationActionResult,
} from "./invite-redeem.i-vm";

/** Lookup failure → screen state. Unmapped keys degrade to the retryable error. */
function vmForFailure(type: string): InviteRedeemVM {
  switch (type) {
    case "link-invalid":
      return { kind: "invalid" };
    case "link-expired":
      return { kind: "expired" };
    case "rate-limited":
      return { kind: "rate-limited" };
    case "tenant-inactive":
      return { kind: "tenant-inactive" };
    default:
      // `network-error`/`unknown` — and `account-exists`/`invalid-input`, which
      // the lookup endpoint cannot produce; if one ever appears, the generic
      // retryable error is the only honest thing to show.
      return { kind: "error" };
  }
}

/**
 * The lookup query's state → the screen state. `loading` is NEW in US-E18.59:
 * the preview used to be resolved server-side before the first paint, so the
 * VM union never needed it.
 */
export function lookupVm(state: {
  token: string;
  isPending: boolean;
  preview?: InvitationPreview;
  error?: unknown;
}): InviteRedeemVM {
  // Defensive twin of the RSC's zero-network short-circuit: a blank token is a
  // broken link, and lookup shares its per-IP budget with redeem.
  if (!state.token.trim()) return { kind: "invalid" };
  // Pending wins over a cached preview: a refetch must not keep showing the
  // previous invitation as if it were still resolved.
  if (state.isPending) return { kind: "loading" };
  if (state.preview) {
    return { kind: "form", token: state.token, preview: state.preview };
  }
  if (state.error !== undefined) {
    return vmForFailure(asInvitationRedeemFailure(state.error).type);
  }
  // Settled with neither payload nor failure should be unreachable; show the
  // retryable error rather than a blank card.
  return { kind: "error" };
}

/** Redeem failure → the stable keys the screen translates (never copy). */
export function toActionResult(err: unknown): RedeemInvitationActionResult {
  const failure = asInvitationRedeemFailure(err);
  return failure.type === "invalid-input"
    ? { errorKey: failure.type, issues: failure.issues }
    : { errorKey: failure.type };
}

/**
 * Submit orchestration: the browser performs the rate-limited `POST /redeem`
 * itself (that is the entire point of ADR 0072), then hands the ALREADY-ISSUED
 * session to the narrow `finalizeRedeemAction`, which writes the httpOnly
 * cookies and redirects. `finalize` receives only what the SERVER returned, so
 * nothing the visitor typed can steer where the browser lands.
 *
 * A throw from `finalize` is deliberately NOT caught: on the happy path it is
 * the redirect, and reporting that as a failure would show an error on a
 * successful signup.
 */
export async function runRedeem(params: {
  token: string;
  password: string;
  fullName: string;
  redeem: (command: RedeemInvitationCommand) => Promise<RedeemedInvitation>;
  finalize: (member: Member, tokens: AuthTokens) => Promise<void>;
}): Promise<RedeemInvitationActionResult> {
  let redeemed: RedeemedInvitation;
  try {
    redeemed = await params.redeem({
      token: params.token,
      password: params.password,
      fullName: params.fullName,
    });
  } catch (err) {
    return toActionResult(err);
  }
  await params.finalize(redeemed.member, redeemed.tokens);
  return {};
}
