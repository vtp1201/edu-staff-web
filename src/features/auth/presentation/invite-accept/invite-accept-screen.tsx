"use client";

import { AlertTriangle, Clock, LogIn, School } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AuthBrandPanel } from "@/components/shared/auth-brand-panel";
import { InvitationNotice } from "@/components/shared/invitation-notice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { IamMemberFailure } from "@/features/auth/domain/failures/iam-member.failure";
import type { InviteAcceptVM } from "./invite-accept.i-vm";

type JoinResult = { errorKey?: IamMemberFailure["type"] };
type SwitchResult = { errorKey?: string };

interface InviteAcceptScreenProps {
  vm: InviteAcceptVM;
  /** Locale-prefixed `/login` href for the auth-gate CTA. */
  loginHref: string;
  /** Submits `{token}`; redirects internally on success (never returns then). */
  onJoin: (token: string) => Promise<JoinResult>;
  /** Signs out + re-lands on the SAME `?token=` URL; returns a key on failure. */
  onSwitchAccount: (token: string) => Promise<SwitchResult>;
}

type ErrorMsgKey =
  | "invitationInvalid"
  | "invitationExpired"
  | "invitationEmailMismatch"
  | "network"
  | "unknown";

/** Failure type → `invitations.accept.errors.*` key (unmapped codes → unknown). */
function errorMsgKey(type: IamMemberFailure["type"]): ErrorMsgKey {
  switch (type) {
    case "invitation-invalid":
      return "invitationInvalid";
    case "invitation-expired":
      return "invitationExpired";
    case "invitation-email-mismatch":
      return "invitationEmailMismatch";
    case "network-error":
      return "network";
    default:
      return "unknown";
  }
}

export function InviteAcceptScreen({
  vm,
  loginHref,
  onJoin,
  onSwitchAccount,
}: InviteAcceptScreenProps) {
  const t = useTranslations("invitations.accept");
  const tBrand = useTranslations("auth.brand");
  // Plain boolean rather than `useTransition`: on the happy path the Server
  // Action redirects (this component unmounts), and on error the `finally`
  // deterministically re-enables the button so the user can retry — an
  // async-transition's `isPending` can stay stuck after a post-await state set.
  const [isPending, setIsPending] = useState(false);
  const [joinErrorKey, setJoinErrorKey] = useState<ErrorMsgKey | null>(null);
  const [switchFailed, setSwitchFailed] = useState(false);

  async function handleJoin(token: string) {
    setJoinErrorKey(null);
    setSwitchFailed(false);
    setIsPending(true);
    try {
      const r = await onJoin(token);
      // Success → the Server Action redirects; only an error returns here.
      if (r.errorKey) setJoinErrorKey(errorMsgKey(r.errorKey));
    } finally {
      setIsPending(false);
    }
  }

  async function handleSwitch(token: string) {
    setSwitchFailed(false);
    setIsPending(true);
    try {
      const r = await onSwitchAccount(token);
      if (r.errorKey) setSwitchFailed(true);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AuthBrandPanel title={tBrand("name")} tagline={tBrand("tagline")} />
      <main className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-[440px]">
          <Card className="p-8">
            {vm.kind === "auth-gate" && (
              <div className="flex flex-col gap-4 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary">
                  <LogIn
                    className="size-6 text-primary-foreground"
                    aria-hidden="true"
                  />
                </div>
                <h1 className="text-xl font-extrabold text-foreground">
                  {t("authGate.title")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("authGate.body")}
                </p>
                <Button asChild className="w-full">
                  <a href={loginHref}>{t("authGate.loginCta")}</a>
                </Button>
              </div>
            )}

            {vm.kind === "signed-in" && (
              <div className="flex flex-col gap-4">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary">
                    <School
                      className="size-6 text-primary-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <h1 className="text-xl font-extrabold text-foreground">
                    {t("join.title")}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("join.body")}
                  </p>
                </div>

                {joinErrorKey && (
                  <p
                    role="alert"
                    className="rounded-lg bg-edu-error-light px-3 py-2 text-sm text-edu-error-text"
                  >
                    {t(`errors.${joinErrorKey}`)}
                  </p>
                )}

                <Button
                  className="w-full"
                  disabled={isPending}
                  aria-busy={isPending}
                  onClick={() => {
                    void handleJoin(vm.token);
                  }}
                >
                  {isPending ? t("join.loading") : t("join.cta")}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  {t("join.currentEmailLabel")}{" "}
                  <strong className="text-foreground">{vm.email}</strong>
                  {" — "}
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center font-bold text-primary hover:underline disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => {
                      void handleSwitch(vm.token);
                    }}
                  >
                    {t("switchAccount.link")}
                  </button>
                </p>

                {switchFailed && (
                  <p
                    role="alert"
                    className="text-center text-xs text-edu-error-text"
                  >
                    {t("switchAccount.failedBody")}
                  </p>
                )}
              </div>
            )}

            {(vm.kind === "invalid" || vm.kind === "expired") && (
              <TokenError kind={vm.kind} loginHref={loginHref} />
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

/**
 * The visual shell moved to `components/shared/invitation-notice` when the
 * public redeem screen (US-E18.53) needed the same pattern — promoted, not
 * copied (decision `0026`). Same DOM/classes as before; this wrapper keeps the
 * accept screen's own copy and its kind→tone/icon choice.
 */
function TokenError({
  kind,
  loginHref,
}: {
  kind: "invalid" | "expired";
  loginHref: string;
}) {
  const t = useTranslations("invitations.accept.tokenError");
  const isExpired = kind === "expired";

  return (
    <InvitationNotice
      tone={isExpired ? "warning" : "error"}
      icon={isExpired ? Clock : AlertTriangle}
      title={isExpired ? t("expired.title") : t("invalid.title")}
      body={isExpired ? t("expired.body") : t("invalid.body")}
      hint={t("contactOffice")}
      linkLabel={t("backToLogin")}
      linkHref={loginHref}
    />
  );
}
