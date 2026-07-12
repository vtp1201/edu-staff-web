"use client";

import { Mail, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import type { EmailVerificationActionResult } from "@/app/[locale]/t/[tenant]/(app)/email-verification.actions";
import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";
import { cn } from "@/shared/utils";
import { useEmailVerify } from "./email-verify-context";

const DISMISS_KEY = "ev-banner-dismissed";

export interface EmailVerifyBannerProps {
  className?: string;
  /** Send/resend server action, supplied by AppShell (server-action-as-prop so
   *  the banner never imports server-only code — Storybook-safe). */
  onSend?: () => Promise<EmailVerificationActionResult>;
}

export function EmailVerifyBanner({
  className,
  onSend,
}: EmailVerifyBannerProps) {
  const t = useTranslations("emailVerify.banner");
  const tErrors = useTranslations("auth.errors");
  const { emailVerified, email, remainingSeconds, startCooldown } =
    useEmailVerify();

  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthFailure["type"] | null>(null);
  const [isPending, startTransition] = useTransition();

  // Read session-scoped dismiss post-mount (avoids SSR/hydration mismatch).
  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
  }, []);

  // Fail-closed: render only when explicitly unverified and status resolved.
  if (emailVerified !== false || dismissed) return null;

  function runSend() {
    if (!onSend) return;
    setErrorKey(null);
    startTransition(async () => {
      const result = await onSend();
      if ("ok" in result) {
        setSent(true);
        startCooldown(); // success only — never started by an error (AC-008.6)
      } else {
        setErrorKey(result.errorKey);
      }
    });
  }

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  const cooling = remainingSeconds > 0;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 border-b border-edu-warning/40 bg-edu-warning/10 px-6 py-2.5 text-edu-warning-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1",
        className,
      )}
    >
      <span className="relative inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-edu-warning/15">
        <Mail className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
        <span
          aria-hidden="true"
          className="-right-0.5 -top-0.5 absolute flex size-3 items-center justify-center rounded-full bg-edu-warning text-[8px] font-extrabold text-edu-warning-foreground leading-none"
        >
          !
        </span>
      </span>

      <p className="min-w-0 flex-1 text-[13px] leading-snug">
        {sent ? (
          <>
            <strong>{t("sentTitle")}</strong> {t("sentBody", { email })}{" "}
            <span aria-live="polite">
              {cooling ? (
                <span className="font-bold opacity-75">
                  {t("resendIn", { seconds: remainingSeconds })}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={runSend}
                  disabled={isPending}
                  className="rounded-md font-extrabold underline underline-offset-2 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
                >
                  {t("resend")}
                </button>
              )}
            </span>
          </>
        ) : (
          <>
            <strong>{t("unverifiedTitle")}</strong> {t("unverifiedBody")}
          </>
        )}
        {errorKey && (
          <span className="ml-2 font-semibold text-edu-error-text">
            {tErrors(errorKey)}
          </span>
        )}
      </p>

      {!sent && (
        <button
          type="button"
          onClick={runSend}
          disabled={isPending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-edu-warning/40 px-3 py-1.5 text-xs font-extrabold text-edu-warning-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
        >
          <Send className="size-3" strokeWidth={2.2} aria-hidden="true" />
          {t("sendButton")}
        </button>
      )}

      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismissAriaLabel")}
        className="grid size-8 min-h-11 min-w-11 shrink-0 place-items-center rounded-md outline-none hover:bg-edu-warning/15 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <X className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  );
}
