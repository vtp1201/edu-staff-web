"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { AuditLogFailure } from "../../../domain/failures/audit-log.failure";

export interface ErrorBannerProps {
  errorKey: AuditLogFailure["type"];
  onRetry: () => void;
}

/** AC-10 — error state with a retry action. Announced via role="alert". */
export function ErrorBanner({ errorKey, onRetry }: ErrorBannerProps) {
  const t = useTranslations("auditLog.errors");

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[var(--edu-radius-card)] border border-border bg-card p-8 text-center shadow-card"
    >
      <span
        className="flex size-11 items-center justify-center rounded-full bg-edu-error/15"
        aria-hidden="true"
      >
        <AlertTriangle className="size-5 text-edu-error-text" />
      </span>
      <p className="font-bold text-base text-foreground">{t("title")}</p>
      <p className="text-muted-foreground text-sm">{t(errorKey)}</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
}
