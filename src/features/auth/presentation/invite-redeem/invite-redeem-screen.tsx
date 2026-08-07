"use client";

import {
  AlertTriangle,
  Clock,
  School,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { AuthBrandPanel } from "@/components/shared/auth-brand-panel";
import { InvitationNotice } from "@/components/shared/invitation-notice";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InvitationFieldIssue } from "@/features/auth/domain/failures/invitation-redeem.failure";
import {
  checkRules,
  strengthLevel,
  strengthScore,
} from "@/shared/password-strength";
import { cn } from "@/shared/utils";
import type {
  InviteRedeemVM,
  RedeemInvitationActionResult,
} from "./invite-redeem.i-vm";

interface InviteRedeemScreenProps {
  vm: InviteRedeemVM;
  /** Locale-prefixed `/login`. */
  loginHref: string;
  /** Locale-prefixed `/invitations/accept?token=…` — the 409 way forward. */
  acceptHref: string;
  /** Submits the redemption; redirects internally on success (never returns then). */
  onRedeem: (
    token: string,
    password: string,
    fullName: string,
  ) => Promise<RedeemInvitationActionResult>;
}

const LEVEL_COLOR = {
  weak: "bg-edu-error",
  fair: "bg-edu-warning",
  strong: "bg-edu-success",
} as const;

/** Role enums the shared `invitations.roleLabels` table can translate. */
const KNOWN_ROLES = [
  "teacher",
  "student",
  "parent",
  "manager",
  "admin",
  "staff",
] as const;
type KnownRole = (typeof KNOWN_ROLES)[number];

function knownRole(wire: string): KnownRole | null {
  const lowered = wire.toLowerCase();
  return (KNOWN_ROLES as readonly string[]).includes(lowered)
    ? (lowered as KnownRole)
    : null;
}

/**
 * Submit failures that end the flow: leaving the form on screen would invite a
 * retry that cannot possibly succeed (a dead link stays dead; a 409 needs the
 * OTHER flow). Everything else stays inline above a still-usable form.
 */
const TERMINAL_KEYS = [
  "account-exists",
  "link-invalid",
  "link-expired",
  "tenant-inactive",
] as const;
type TerminalKey = (typeof TERMINAL_KEYS)[number];

function isTerminal(key: string | null): key is TerminalKey {
  return (TERMINAL_KEYS as readonly string[]).includes(key ?? "");
}

/** Inline (non-terminal) submit failure → `submitErrors.*` copy key. */
const INLINE_ERROR_COPY = {
  "invalid-input": "invalidInput",
  "rate-limited": "rateLimited",
  "network-error": "network",
  unknown: "unknown",
} as const;

/**
 * PUBLIC self-serve invitation redemption (US-E18.53, IAM US-191, amending
 * ADR 0059). Step 1 (the preview) already ran server-side and arrives as `vm`;
 * this component renders it read-only and collects the two things BE needs —
 * `fullName` + `password`. There is deliberately NO email input: the account's
 * address is the invitation's, so the form only displays it.
 */
export function InviteRedeemScreen({
  vm,
  loginHref,
  acceptHref,
  onRedeem,
}: InviteRedeemScreenProps) {
  const t = useTranslations("invitations.redeem");
  const tRoles = useTranslations("invitations.roleLabels");
  const tBrand = useTranslations("auth.brand");
  const format = useFormatter();
  const fieldId = useId();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // Plain boolean rather than `useTransition`: the happy path redirects (this
  // component unmounts) and the `finally` deterministically re-enables the
  // button, which an async transition's `isPending` can fail to do after a
  // post-await state set.
  const [isPending, setIsPending] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [issues, setIssues] = useState<InvitationFieldIssue[]>([]);

  const nameId = `${fieldId}-name`;
  const pwId = `${fieldId}-password`;
  const pwHintId = `${fieldId}-password-hint`;
  const confirmId = `${fieldId}-confirm`;
  const nameErrId = `${fieldId}-name-error`;
  const pwErrId = `${fieldId}-password-error`;
  const confirmErrId = `${fieldId}-confirm-error`;

  const nameIssue = issues.find((i) => i.startsWith("fullName"));
  const pwIssue = issues.find((i) => i.startsWith("password"));
  const mismatch = errorKey === "__mismatch";
  const level = strengthLevel(password);

  async function submit(token: string) {
    setErrorKey(null);
    setIssues([]);
    if (password !== confirm) {
      setErrorKey("__mismatch");
      return;
    }
    setIsPending(true);
    try {
      const r = await onRedeem(token, password, fullName);
      // Success → the Server Action redirects; only a failure returns here.
      if (r.errorKey) {
        setErrorKey(r.errorKey);
        setIssues(r.issues ?? []);
      }
    } finally {
      setIsPending(false);
    }
  }

  // A terminal submit failure replaces the whole form (see TERMINAL_KEYS).
  const terminalKey = isTerminal(errorKey) ? errorKey : null;

  return (
    <div className="flex min-h-screen bg-background">
      <AuthBrandPanel title={tBrand("name")} tagline={tBrand("tagline")} />
      <main className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-[460px]">
          <Card className="p-8">
            {vm.kind === "invalid" && (
              <InvitationNotice
                tone="error"
                icon={AlertTriangle}
                title={t("states.invalid.title")}
                body={t("states.invalid.body")}
                hint={t("states.contactOffice")}
                linkLabel={t("states.backToLogin")}
                linkHref={loginHref}
              />
            )}

            {vm.kind === "expired" && (
              <InvitationNotice
                tone="warning"
                icon={Clock}
                title={t("states.expired.title")}
                body={t("states.expired.body")}
                hint={t("states.contactOffice")}
                linkLabel={t("states.backToLogin")}
                linkHref={loginHref}
              />
            )}

            {vm.kind === "rate-limited" && (
              <InvitationNotice
                tone="warning"
                icon={ShieldAlert}
                title={t("states.rateLimited.title")}
                body={t("states.rateLimited.body")}
                linkLabel={t("states.backToLogin")}
                linkHref={loginHref}
              />
            )}

            {vm.kind === "tenant-inactive" && (
              <InvitationNotice
                tone="error"
                icon={School}
                title={t("states.tenantInactive.title")}
                body={t("states.tenantInactive.body")}
                hint={t("states.contactOffice")}
                linkLabel={t("states.backToLogin")}
                linkHref={loginHref}
              />
            )}

            {vm.kind === "error" && (
              <InvitationNotice
                tone="error"
                icon={AlertTriangle}
                title={t("states.error.title")}
                body={t("states.error.body")}
                linkLabel={t("states.backToLogin")}
                linkHref={loginHref}
              />
            )}

            {vm.kind === "form" && terminalKey === "account-exists" && (
              <InvitationNotice
                tone="warning"
                icon={UserPlus}
                title={t("accountExists.title")}
                body={t("accountExists.body", { email: vm.preview.email })}
                linkLabel={t("states.backToLogin")}
                linkHref={loginHref}
              >
                <Button asChild className="w-full">
                  <a href={acceptHref}>{t("accountExists.cta")}</a>
                </Button>
              </InvitationNotice>
            )}

            {vm.kind === "form" &&
              terminalKey !== null &&
              terminalKey !== "account-exists" && (
                <InvitationNotice
                  tone={terminalKey === "link-expired" ? "warning" : "error"}
                  icon={terminalKey === "link-expired" ? Clock : AlertTriangle}
                  title={
                    terminalKey === "link-expired"
                      ? t("states.expired.title")
                      : terminalKey === "tenant-inactive"
                        ? t("states.tenantInactive.title")
                        : t("states.invalid.title")
                  }
                  body={
                    terminalKey === "link-expired"
                      ? t("states.expired.body")
                      : terminalKey === "tenant-inactive"
                        ? t("states.tenantInactive.body")
                        : t("states.invalid.body")
                  }
                  hint={t("states.contactOffice")}
                  linkLabel={t("states.backToLogin")}
                  linkHref={loginHref}
                />
              )}

            {vm.kind === "form" && terminalKey === null && (
              <div className="flex flex-col gap-5">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary">
                    <School
                      className="size-6 text-primary-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <h1 className="text-xl font-extrabold text-foreground">
                    {t("preview.title")}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("preview.intro", {
                      tenantName: vm.preview.tenantName,
                    })}
                  </p>
                </div>

                <dl className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {t("preview.roleLabel")}
                    </dt>
                    <dd className="flex flex-wrap justify-end gap-1.5">
                      {vm.preview.roles.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {t("preview.noRole")}
                        </span>
                      ) : (
                        vm.preview.roles.map((role) => {
                          const known = knownRole(role);
                          return (
                            <StatusBadge key={role} tone="primary">
                              {known ? tRoles(known) : role}
                            </StatusBadge>
                          );
                        })
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {t("preview.emailLabel")}
                    </dt>
                    <dd className="text-sm font-bold break-all text-foreground">
                      {vm.preview.email}
                    </dd>
                    <dd className="text-xs text-muted-foreground">
                      {t("preview.emailHint")}
                    </dd>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("preview.expiresAt", {
                      date: format.dateTime(new Date(vm.preview.expiresAt), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }),
                    })}
                  </p>
                </dl>

                {errorKey !== null && !mismatch && (
                  <p
                    role="alert"
                    className="rounded-lg bg-edu-error-light px-3 py-2 text-sm text-edu-error-text"
                  >
                    {t(
                      `submitErrors.${
                        INLINE_ERROR_COPY[
                          errorKey as keyof typeof INLINE_ERROR_COPY
                        ] ?? "unknown"
                      }`,
                    )}
                  </p>
                )}

                <form
                  className="flex flex-col gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submit(vm.token);
                  }}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor={nameId}>{t("form.fullName")}</Label>
                    <Input
                      id={nameId}
                      name="fullName"
                      autoComplete="name"
                      required
                      maxLength={128}
                      placeholder={t("form.fullNamePlaceholder")}
                      value={fullName}
                      aria-invalid={nameIssue ? true : undefined}
                      aria-describedby={nameIssue ? nameErrId : undefined}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    {nameIssue && (
                      <p id={nameErrId} className="text-xs text-edu-error-text">
                        {t(`fieldErrors.${nameIssue}`)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={pwId}>{t("form.password")}</Label>
                    <Input
                      id={pwId}
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      aria-invalid={pwIssue ? true : undefined}
                      aria-describedby={[pwHintId, pwIssue && pwErrId]
                        .filter(Boolean)
                        .join(" ")}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    {/* Decorative: the actionable rule is the text hint below,
                        which is what `aria-describedby` points at. */}
                    <div className="flex gap-1.5 pt-1" aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1.5 flex-1 rounded-full",
                            level !== "empty" && i < strengthScore(password)
                              ? LEVEL_COLOR[level]
                              : "bg-border",
                          )}
                        />
                      ))}
                    </div>
                    <p id={pwHintId} className="text-xs text-muted-foreground">
                      {t("form.passwordHint")}
                    </p>
                    {pwIssue && (
                      <p id={pwErrId} className="text-xs text-edu-error-text">
                        {t(`fieldErrors.${pwIssue}`)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={confirmId}>{t("form.confirm")}</Label>
                    <Input
                      id={confirmId}
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirm}
                      aria-invalid={mismatch ? true : undefined}
                      aria-describedby={mismatch ? confirmErrId : undefined}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                    {mismatch && (
                      <p
                        id={confirmErrId}
                        role="alert"
                        className="text-xs text-edu-error-text"
                      >
                        {t("form.mismatch")}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    // Same client-side gate the sibling reset-password flow
                    // uses (`checkRules(pw).length` = the ≥8 rule); the
                    // composition policy stays BE's to enforce.
                    disabled={
                      isPending ||
                      !checkRules(password).length ||
                      confirm.length === 0 ||
                      fullName.trim().length === 0
                    }
                    aria-busy={isPending}
                  >
                    {isPending ? t("form.submitting") : t("form.submit")}
                  </Button>
                </form>

                <a
                  href={loginHref}
                  className="inline-flex min-h-11 items-center justify-center text-sm font-bold text-primary hover:underline"
                >
                  {t("states.backToLogin")}
                </a>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
