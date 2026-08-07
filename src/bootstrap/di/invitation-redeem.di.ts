import "server-only";

import { createHttpClient } from "@/bootstrap/lib/http";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import { LookupInvitationUseCase } from "@/features/auth/domain/use-cases/lookup-invitation.use-case";
import { RedeemInvitationUseCase } from "@/features/auth/domain/use-cases/redeem-invitation.use-case";
import { InvitationRedeemRepository } from "@/features/auth/infrastructure/repositories/invitation-redeem.repository";
import { MockInvitationRedeemRepository } from "@/features/auth/infrastructure/repositories/mocks/invitation-redeem.mock.repository";

/**
 * Composition root for the PUBLIC invitation lookup/redeem flow (US-E18.53,
 * IAM US-191 / ADR 0130/0131).
 *
 * Deliberately NOT in `auth.di.ts`, and deliberately NOT using
 * `createServerHttpClient()` / `ensureFreshSession()`: both endpoints are
 * unauthenticated and the visitor has no account yet. Attaching a stale
 * `auth_token` cookie (possibly belonging to a DIFFERENT signed-in person on a
 * shared device) to an account-creation call would be a real confused-deputy
 * risk, and refreshing a session that has nothing to do with this invitation
 * would be pure waste. So: a bare `createHttpClient()` with no bearer token.
 */
function makeRepo() {
  if (USE_MOCK) return new MockInvitationRedeemRepository();
  return new InvitationRedeemRepository(createHttpClient());
}

/** `POST /invitations/lookup` — read-only preview for the redemption form. */
export async function makeLookupInvitationUseCase() {
  return new LookupInvitationUseCase(makeRepo());
}

/** `POST /invitations/redeem` — creates the account + membership + session. */
export async function makeRedeemInvitationUseCase() {
  return new RedeemInvitationUseCase(makeRepo());
}
