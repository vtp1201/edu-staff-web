/**
 * Client-safe composition for the browser-direct invitation flow
 * (US-E18.59, ADR 0072).
 *
 * This is the client-side equivalent of a DI factory and is deliberately NOT
 * under `bootstrap/di/`: that directory's whole contract is `server-only`
 * composition, so putting a factory that runs in the browser there would be a
 * lie about the layer. For the same reason it reads
 * `process.env.NEXT_PUBLIC_USE_MOCK` directly instead of importing
 * `bootstrap/lib/mock.ts#USE_MOCK` (that module is `server-only`).
 *
 * Scope: the invitation lookup/redeem slice ONLY. A second browser-direct
 * consumer needs its own ADR, and would be the trigger to promote a shared
 * `bootstrap/lib/http.browser.ts` (ADR 0072 §Follow-Up).
 */
import type { IInvitationRedeemRepository } from "../../domain/repositories/i-invitation-redeem.repository";
import { BrowserInvitationRedeemRepository } from "./invitation-redeem.browser.repository";
import { BrowserMockInvitationRedeemRepository } from "./mocks/invitation-redeem.browser-mock.repository";

/**
 * Enough latency for the new client-side loading state to be observable in
 * mock mode, short enough not to feel broken. Real mode has real latency.
 */
const MOCK_LATENCY_MS = 400;

export function makeBrowserInvitationRedeemRepository(): IInvitationRedeemRepository {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    return new BrowserMockInvitationRedeemRepository(MOCK_LATENCY_MS);
  }
  return new BrowserInvitationRedeemRepository();
}
