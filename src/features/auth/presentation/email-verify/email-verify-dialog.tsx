"use client";

import { CircleAlert, Mail, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, useTransition } from "react";
import type { EmailVerificationActionResult } from "@/app/[locale]/t/[tenant]/(app)/email-verification.actions";
import { OtpInput } from "@/components/shared/otp-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";
import { useEmailVerify } from "./email-verify-context";

type DialogStatus =
  | "idle"
  | "pending"
  | "error-wrong"
  | "error-expired"
  | "error-lockout"
  | "error-generic"
  | "success";

export interface EmailVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Confirm OTP server action (server-action-as-prop). */
  onConfirm?: (otp: string) => Promise<EmailVerificationActionResult>;
  /** Send/resend server action (server-action-as-prop). */
  onResend?: () => Promise<EmailVerificationActionResult>;
}

export function EmailVerifyDialog({
  open,
  onOpenChange,
  onConfirm,
  onResend,
}: EmailVerifyDialogProps) {
  const t = useTranslations("emailVerify.dialog");
  const tErrors = useTranslations("auth.errors");
  const { email, remainingSeconds, startCooldown, markVerified } =
    useEmailVerify();

  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<DialogStatus>("idle");
  const [errorKey, setErrorKey] = useState<AuthFailure["type"] | null>(null);
  const [resendErrorKey, setResendErrorKey] = useState<
    AuthFailure["type"] | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const errId = useId();

  // Capture the control that opened the dialog so focus can be restored to it
  // on close (AC-003.5 / NFR-004). Radix's default `onCloseAutoFocus` defers to
  // `context.triggerRef`, which is only populated by `<DialogTrigger>` — this
  // dialog is controlled via `open`/`onOpenChange` from a plain button, so that
  // ref is always null and focus would fall through to <body>. We snapshot
  // `document.activeElement` during the render where `open` flips to true
  // (before Radix's focus-trap layout effect moves focus into the dialog).
  const invokerRef = useRef<HTMLElement | null>(null);
  const prevOpenRef = useRef(open);
  if (open && !prevOpenRef.current) {
    invokerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }
  prevOpenRef.current = open;

  const cooling = remainingSeconds > 0;
  const isCellError =
    status === "error-wrong" ||
    status === "error-expired" ||
    status === "error-lockout";
  const cellsDisabled = status === "error-lockout";
  const resendEmphasised =
    status === "error-expired" || status === "error-lockout";

  const bodyError =
    status === "error-wrong"
      ? t("errorWrong")
      : status === "error-expired"
        ? t("errorExpired")
        : status === "error-lockout"
          ? t("errorLockout")
          : status === "error-generic" && errorKey
            ? tErrors(errorKey)
            : null;

  function handleOpenChange(next: boolean) {
    // Clear OTP + transient state on close (NFR-008 — never persist the code).
    if (!next) {
      setOtp("");
      setStatus("idle");
      setErrorKey(null);
      setResendErrorKey(null);
    }
    onOpenChange(next);
  }

  function confirm() {
    if (!onConfirm || otp.length !== 6) return;
    setStatus("pending");
    setErrorKey(null);
    startTransition(async () => {
      const result = await onConfirm(otp);
      if ("ok" in result) {
        markVerified();
        setStatus("success");
        return;
      }
      switch (result.errorKey) {
        case "invalid-otp":
          setStatus("error-wrong"); // OTP kept — editable
          break;
        case "otp-expired":
          setStatus("error-expired");
          break;
        case "too-many-requests":
          setStatus("error-lockout"); // cells locked until Resend
          break;
        default:
          setStatus("error-generic");
          setErrorKey(result.errorKey);
      }
    });
  }

  function resend() {
    if (!onResend || cooling) return;
    setResendErrorKey(null);
    startTransition(async () => {
      const result = await onResend();
      if ("ok" in result) {
        startCooldown();
        // Re-enable cells and clear the expired/lockout body error.
        setOtp("");
        setStatus("idle");
        setErrorKey(null);
      } else {
        // Inline resend error — does NOT replace the existing body error.
        setResendErrorKey(result.errorKey);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-[420px]"
        onCloseAutoFocus={(e) => {
          // Restore focus to the invoking control (AC-003.5) — Radix's default
          // would focus <body> here since there is no <DialogTrigger>.
          if (invokerRef.current) {
            e.preventDefault();
            invokerRef.current.focus();
          }
        }}
      >
        {status === "success" ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <span className="grid size-18 place-items-center rounded-full bg-edu-teal-light">
              <MailCheck
                className="size-8 text-edu-teal"
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </span>
            <DialogHeader className="items-center gap-2">
              <DialogTitle>{t("successTitle")}</DialogTitle>
              <DialogDescription>
                {t("successBody", { email })}
              </DialogDescription>
            </DialogHeader>
            <Button className="w-full" onClick={() => handleOpenChange(false)}>
              {t("done")}
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="flex-row items-start gap-3 space-y-0 text-left">
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary/15">
                <Mail
                  className="size-4 text-primary"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-base">{t("title")}</DialogTitle>
                <DialogDescription className="text-xs">
                  {t("description", { email })}
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <OtpInput
                value={otp}
                onChange={setOtp}
                error={isCellError}
                disabled={cellsDisabled}
                describedById={errId}
                groupAriaLabel={t("codeGroupAriaLabel")}
                digitAriaLabel={(n) => t("digitAriaLabel", { n })}
              />

              {bodyError && (
                <p
                  id={errId}
                  role="alert"
                  className="flex items-center justify-center gap-1.5 text-center text-[13px] font-semibold text-edu-error-text"
                >
                  <CircleAlert
                    className="size-3.5 shrink-0"
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                  <span>{bodyError}</span>
                </p>
              )}

              <div
                aria-live="polite"
                className="text-center text-xs text-muted-foreground"
              >
                {cooling ? (
                  <span>{t("resendIn", { seconds: remainingSeconds })}</span>
                ) : (
                  <Button
                    type="button"
                    variant={resendEmphasised ? "default" : "link"}
                    size="sm"
                    onClick={resend}
                    disabled={isPending}
                  >
                    {t("resend")}
                  </Button>
                )}
                {resendErrorKey && (
                  <p className="mt-1 font-semibold text-edu-error-text">
                    {tErrors(resendErrorKey)}
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={confirm}
                disabled={otp.length !== 6 || status === "pending" || isPending}
              >
                {status === "pending" ? t("confirming") : t("confirm")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
