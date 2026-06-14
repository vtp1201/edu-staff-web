"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";
import { LoginFormContainer } from "./login-form";

/**
 * Thin client boundary that supplies the Google OAuth context to the login form.
 * `clientId` is injected from `NEXT_PUBLIC_GOOGLE_CLIENT_ID` by the RSC page; an
 * empty value still renders — clicking Google then surfaces `sso-unavailable`
 * via the hook's error callback rather than crashing.
 */
export function GoogleAuthWrapper({
  clientId,
  action,
  socialAction,
}: {
  clientId: string;
  action: (
    email: string,
    password: string,
  ) => Promise<{ errorKey?: AuthFailure["type"] }>;
  socialAction: (
    provider: "google" | "vneid",
    token: string,
  ) => Promise<{ errorKey?: AuthFailure["type"] }>;
}) {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <LoginFormContainer action={action} socialAction={socialAction} />
    </GoogleOAuthProvider>
  );
}
