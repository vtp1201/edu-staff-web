"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useEmailVerifyCooldown } from "./use-email-verify-cooldown";

export interface EmailVerifyContextValue {
  /** Tri-state: null = unresolved/fetch-error (fail-closed). Only flipped
   *  client-side by markVerified(). */
  emailVerified: boolean | null;
  email: string;
  /** Optimistic local flip on a confirmed 204. Idempotent. */
  markVerified: () => void;
  /** Cooldown remaining seconds (0 = actionable). */
  remainingSeconds: number;
  /** (Re)start a fresh 60s cooldown — shared by banner + dialog. */
  startCooldown: () => void;
}

const EmailVerifyContext = createContext<EmailVerifyContextValue | null>(null);

export function EmailVerifyProvider({
  initialEmailVerified,
  email,
  children,
}: {
  initialEmailVerified: boolean | null;
  email: string;
  children: React.ReactNode;
}) {
  const [emailVerified, setEmailVerified] = useState<boolean | null>(
    initialEmailVerified,
  );
  const { remainingSeconds, start: startCooldown } = useEmailVerifyCooldown();

  const value = useMemo<EmailVerifyContextValue>(
    () => ({
      emailVerified,
      email,
      markVerified: () => setEmailVerified(true),
      remainingSeconds,
      startCooldown,
    }),
    [emailVerified, email, remainingSeconds, startCooldown],
  );

  return (
    <EmailVerifyContext.Provider value={value}>
      {children}
    </EmailVerifyContext.Provider>
  );
}

export function useEmailVerify(): EmailVerifyContextValue {
  const ctx = useContext(EmailVerifyContext);
  if (ctx === null) {
    throw new Error("useEmailVerify must be used within EmailVerifyProvider");
  }
  return ctx;
}
