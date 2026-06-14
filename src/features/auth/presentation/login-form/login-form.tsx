"use client";
import { useGoogleLogin } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { GoogleIcon, VneidIcon } from "@/components/shared/sso-icons";
import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";
import { cn } from "@/shared/utils";
import type { LoginFormVM } from "./login-form.i-vm";

const SSO_BTN = cn(
  "flex min-h-11 w-full items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-border bg-card px-4 py-3",
  "font-semibold text-[13.5px] text-foreground",
  "transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none",
  "hover:border-primary hover:shadow-[0_0_0_3px_color-mix(in_srgb,var(--edu-primary)_12%,transparent)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

export function LoginForm({
  isLoading,
  errorKey,
  onSubmit,
  onGoogleSignin,
  isGoogleLoading,
  onVneidSignin,
}: LoginFormVM) {
  const t = useTranslations("auth.login");
  const tSso = useTranslations("auth.sso");
  const tErrors = useTranslations("auth.errors");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const vneidEnabled = Boolean(onVneidSignin);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onGoogleSignin}
          disabled={isGoogleLoading || isLoading}
          className={SSO_BTN}
        >
          {isGoogleLoading ? (
            <Loader2
              className="size-[18px] animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <GoogleIcon className="size-[18px]" />
          )}
          {isGoogleLoading ? tSso("googleLoading") : tSso("continueWithGoogle")}
        </button>

        <button
          type="button"
          onClick={vneidEnabled ? onVneidSignin : undefined}
          aria-disabled={!vneidEnabled}
          aria-describedby={vneidEnabled ? undefined : "vneid-coming-soon"}
          aria-label={
            vneidEnabled
              ? undefined
              : `${tSso("loginWithVneID")} — ${tSso("vneidComingSoon")}`
          }
          className={cn(SSO_BTN, !vneidEnabled && "opacity-60")}
        >
          <VneidIcon className="size-[18px]" />
          {tSso("loginWithVneID")}
          {!vneidEnabled ? (
            <span
              id="vneid-coming-soon"
              className="ml-1 rounded-full border border-border bg-edu-bg px-2 py-px font-semibold text-[10px] text-edu-text-secondary"
            >
              {tSso("vneidComingSoon")}
            </span>
          ) : null}
        </button>
      </div>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[12px] text-muted-foreground">
          {tSso("divider")}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email, password);
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="sr-only">
            {t("email")}
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("email")}
            required
            className="rounded-lg border border-border px-4 py-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-password" className="sr-only">
            {t("password")}
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("password")}
            required
            className="rounded-lg border border-border px-4 py-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {errorKey && (
          <p className="text-sm text-edu-error-text" role="alert">
            {tErrors(errorKey)}
          </p>
        )}
        <button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {isLoading ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
}

export function LoginFormContainer({
  action,
  socialAction,
}: {
  action: (
    email: string,
    password: string,
  ) => Promise<{ errorKey?: AuthFailure["type"] }>;
  socialAction: (
    provider: "google" | "vneid",
    token: string,
  ) => Promise<{ errorKey?: AuthFailure["type"] }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [isGoogleLoading, startGoogle] = useTransition();
  const [errorKey, setErrorKey] = useState<AuthFailure["type"] | null>(null);

  function handleSubmit(email: string, password: string) {
    startTransition(async () => {
      const result = await action(email, password);
      setErrorKey(result.errorKey ?? null);
    });
  }

  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      startGoogle(async () => {
        const result = await socialAction("google", tokenResponse.access_token);
        setErrorKey(result.errorKey ?? null);
      });
    },
    // Popup closed / denied / client id missing → surface the SSO failure key.
    onError: () => setErrorKey("sso-unavailable"),
    onNonOAuthError: () => setErrorKey("sso-unavailable"),
  });

  return (
    <LoginForm
      isLoading={isPending}
      isGoogleLoading={isGoogleLoading}
      errorKey={errorKey}
      onSubmit={handleSubmit}
      onGoogleSignin={() => googleLogin()}
      // VNeID intentionally undefined → rendered disabled (ADR 0035).
      onVneidSignin={undefined}
    />
  );
}
