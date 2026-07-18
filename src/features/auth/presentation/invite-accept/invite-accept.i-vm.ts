/**
 * ViewModel for the public `/invitations/accept` screen (US-E21.2, ADR 0059).
 * Derived once server-side in `page.tsx` from the `?token=` param + the session
 * cookie presence; the client component renders the matching state.
 *
 * No `loading`/`success` variant: loading is local `useTransition` state during
 * the join submit; success is a Server Action redirect, never a render.
 */
export type InviteAcceptVM =
  | { kind: "auth-gate" }
  | { kind: "signed-in"; email: string; token: string }
  | { kind: "invalid" } // missing/malformed token OR a terminal invalid/used/revoked
  | { kind: "expired" }; // terminal expired invitation
