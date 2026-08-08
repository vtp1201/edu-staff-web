import { getLocale } from "next-intl/server";
import { InviteRedeemContainer } from "@/features/auth/presentation/invite-redeem/invite-redeem-container";
import { InviteRedeemScreen } from "@/features/auth/presentation/invite-redeem/invite-redeem-screen";
import { finalizeRedeemAction } from "./actions";

/**
 * PUBLIC `/invitations/redeem?token=...` (US-E18.53, rewired by US-E18.59 /
 * ADR 0072).
 *
 * This page NO LONGER fetches. Both IAM calls — the `lookup` preview and the
 * `redeem` submit — are per-IP rate limited (10/min) and are now issued by the
 * BROWSER from `InviteRedeemContainer`, so Kong sees each visitor's own IP
 * rather than this server's single egress IP (one abusive invitee used to be
 * able to 429-lock every other invitee out of account creation). All that is
 * left here is routing: read the param, build the two hrefs, hand over the
 * narrow `finalizeRedeemAction` that writes the session cookies afterwards.
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

  // Zero network AND zero query machinery: lookup shares its per-IP rate-limit
  // budget with redeem, so a malformed link must not spend a slot the real
  // attempt will need. Rendering the dead-link card straight from the server
  // keeps that guarantee structural rather than a flag inside the container.
  if (!token?.trim()) {
    return (
      <InviteRedeemScreen
        vm={{ kind: "invalid" }}
        loginHref={loginHref}
        acceptHref={acceptHref}
      />
    );
  }

  return (
    <InviteRedeemContainer
      token={token}
      loginHref={loginHref}
      acceptHref={acceptHref}
      onFinalize={finalizeRedeemAction}
    />
  );
}
