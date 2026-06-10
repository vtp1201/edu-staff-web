"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  checkRules,
  strengthLevel,
  strengthScore,
} from "@/shared/password-strength";
import { cn } from "@/shared/utils";
import type { ForgotPasswordVM } from "./forgot-password.i-vm";
import { OtpInput } from "./otp-input";

const LEVEL_COLOR = {
  weak: "bg-edu-error",
  fair: "bg-edu-warning",
  strong: "bg-edu-success",
} as const;

export function ForgotPassword({
  onRequest,
  onReset,
  loginHref,
}: ForgotPasswordVM) {
  const t = useTranslations("auth.forgot");
  const tErrors = useTranslations("auth.errors");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const level = strengthLevel(pw);

  function request() {
    setErrorKey(null);
    startTransition(async () => {
      const r = await onRequest(email);
      if (r.errorKey) setErrorKey(r.errorKey);
      else setStep(2);
    });
  }

  function reset() {
    setErrorKey(null);
    if (pw !== confirm) {
      setErrorKey("__mismatch");
      return;
    }
    startTransition(async () => {
      const r = await onReset(email, otp, pw);
      if (r.errorKey) {
        setErrorKey(r.errorKey);
        if (r.errorKey === "invalid-otp" || r.errorKey === "otp-expired")
          setStep(2);
      } else {
        setStep(4);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <h1 className="text-2xl font-extrabold text-foreground">{t("title")}</h1>

      {errorKey && (
        <p className="mt-3 rounded-lg bg-edu-error/10 px-3 py-2 text-sm text-edu-error">
          {errorKey === "__mismatch"
            ? t("step3.mismatch")
            : tErrors(errorKey as never)}
        </p>
      )}

      {step === 1 && (
        <form
          className="mt-5 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            request();
          }}
        >
          <p className="text-sm text-muted-foreground">{t("step1.subtitle")}</p>
          <div className="space-y-1.5">
            <Label>{t("step1.email")}</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? t("step1.sending") : t("step1.submit")}
          </Button>
        </form>
      )}

      {step === 2 && (
        <div className="mt-5 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t("step2.subtitle")}</p>
          <OtpInput value={otp} onChange={setOtp} />
          <Button disabled={otp.length !== 6} onClick={() => setStep(3)}>
            {t("step2.submit")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={request}
          >
            {t("step2.resend")}
          </Button>
        </div>
      )}

      {step === 3 && (
        <form
          className="mt-5 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            reset();
          }}
        >
          <p className="text-sm text-muted-foreground">{t("step3.subtitle")}</p>
          <div className="space-y-1.5">
            <Label>{t("step3.new")}</Label>
            <Input
              type="password"
              required
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            <div className="flex gap-1.5 pt-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full",
                    level !== "empty" && i < strengthScore(pw)
                      ? LEVEL_COLOR[level]
                      : "bg-border",
                  )}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("step3.confirm")}</Label>
            <Input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isPending || !checkRules(pw).length}>
            {isPending ? t("step3.submitting") : t("step3.submit")}
          </Button>
        </form>
      )}

      {step === 4 && (
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="size-12 text-edu-success" />
          <h2 className="text-lg font-bold text-foreground">
            {t("step4.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("step4.subtitle")}</p>
          <Button asChild>
            <a href={loginHref}>{t("step4.cta")}</a>
          </Button>
        </div>
      )}

      {step !== 4 && (
        <a
          href={loginHref}
          className="mt-5 inline-block text-sm font-medium text-primary hover:underline"
        >
          {t("backToLogin")}
        </a>
      )}
    </div>
  );
}
