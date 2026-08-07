import { getLocale } from "next-intl/server";
import { makeLookupInvitationUseCase } from "@/bootstrap/di/invitation-redeem.di";
import type { InvitationRedeemFailure } from "@/features/auth/domain/failures/invitation-redeem.failure";
import type { InviteRedeemVM } from "@/features/auth/presentation/invite-redeem/invite-redeem.i-vm";
import { InviteRedeemScreen } from "@/features/auth/presentation/invite-redeem/invite-redeem-screen";
import { redeemAction } from "./actions";

/** Lookup failure → screen state. Unmapped keys degrade to the retryable error. */
function vmForFailure(type: InvitationRedeemFailure["type"]): InviteRedeemVM {
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
 * PUBLIC `/invitations/redeem?token=...` (US-E18.53, IAM US-191, amending
 * ADR 0059's "no guest account-creation" premise now that BE ships the
 * capability). Step 1 of the two-step flow runs here, server-side: one
 * `POST /invitations/lookup` resolves the invitation so the form can name the
 * school, the roles and the invited email instead of asking for a password
 * blind. Step 2 (the password + full-name submit) is `redeemAction`.
 *
 * The token reaches this page as a `?token=` PAGE param — the emailed link's
 * unavoidable shape, matching the sibling `invitations/accept?token=`. It is
 * then passed only through the prop chain into the POST BODY of both API calls;
 * it is never persisted and never re-attached to an outbound query string.
 */
export default async function InviteRedeemPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const locale = await getLocale();
  const { token } = await searchParams;
  const loginHref = `/${locale}/login`;
  // Where a 409 (the invited email already has an account) sends the visitor:
  // the EXISTING signed-in accept flow, which auth-gates then joins.
  const acceptHref = token?.trim()
    ? `/${locale}/invitations/accept?token=${encodeURIComponent(token)}`
    : `/${locale}/invitations/accept`;

  let vm: InviteRedeemVM;
  if (!token?.trim()) {
    // Zero network: lookup shares its per-IP rate-limit budget with redeem, so
    // a malformed link must not spend a slot the real attempt will need.
    vm = { kind: "invalid" };
  } else {
    const result = await (await makeLookupInvitationUseCase()).execute(token);
    vm = result.data
      ? { kind: "form", token, preview: result.data }
      : vmForFailure(result.error.type);
  }

  return (
    <InviteRedeemScreen
      vm={vm}
      loginHref={loginHref}
      acceptHref={acceptHref}
      onRedeem={redeemAction}
    />
  );
}
