"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { PrincipalReportsFailure } from "@/features/principal/domain/reports/failures/principal-reports.failure";

export interface RegionErrorStateProps {
  errorKey: PrincipalReportsFailure["type"];
  onRetry: () => void;
}

/**
 * Scoped per-region error + retry (FR-011). `role="alert"` so screen readers
 * announce it without focus. Translates `errors.<key>` at presentation — the
 * server/use-case never translates (i18n.md boundary). Feature-local, reused 4×
 * within this screen (component-architecture.md §1 gap).
 */
export function RegionErrorState({ errorKey, onRetry }: RegionErrorStateProps) {
  const t = useTranslations("reports");
  return (
    <div
      role="alert"
      className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[var(--edu-radius-card)] border border-border bg-card px-6 py-8 text-center"
    >
      <span className="grid size-12 place-items-center rounded-full bg-edu-error/15">
        <AlertTriangle
          className="size-6 text-edu-error-text"
          aria-hidden="true"
        />
      </span>
      <div>
        <p className="text-sm font-bold text-foreground">{t("errorTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(`errors.${errorKey}`)}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCw className="size-4" aria-hidden="true" />
        {t("retry")}
      </Button>
    </div>
  );
}
