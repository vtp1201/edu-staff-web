import { getLocale } from "next-intl/server";
import { makeGetProfileUseCase } from "@/bootstrap/di/auth.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import type { InviteAcceptVM } from "@/features/auth/presentation/invite-accept/invite-accept.i-vm";
import { InviteAcceptScreen } from "@/features/auth/presentation/invite-accept/invite-accept-screen";
import { joinAction, switchAccountAction } from "./actions";

/**
 * Public `/invitations/accept?token=...` (US-E21.2, ADR 0059). Derives the
 * screen state server-side, once:
 *  - no/blank token → `invalid` (client-side short-circuit, zero network call);
 *  - token but no session cookie → `auth-gate` (must sign in with the invited
 *    account — this app has no self-serve registration);
 *  - token + session → `signed-in` (single Join action submits `{token}`).
 * The token is passed only through the prop chain — never persisted.
 */
export default async function InviteAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const locale = await getLocale();
  const loginHref = `/${locale}/login`;
  const { token } = await searchParams;

  let vm: InviteAcceptVM;
  if (!token?.trim()) {
    vm = { kind: "invalid" };
  } else {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      vm = { kind: "auth-gate" };
    } else {
      // A present-but-unusable session (e.g. refresh failed) falls back to the
      // auth-gate rather than crashing the public page.
      const profile = await (await makeGetProfileUseCase()).execute();
      vm = profile.data
        ? { kind: "signed-in", email: profile.data.email, token }
        : { kind: "auth-gate" };
    }
  }

  return (
    <InviteAcceptScreen
      vm={vm}
      loginHref={loginHref}
      onJoin={joinAction}
      onSwitchAccount={switchAccountAction}
    />
  );
}
