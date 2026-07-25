"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * List-level error + retry (AC-001.4/AC-002.5). `role="alert"` so the failure is
 * announced; the retry re-issues the SAME filter (the container owns that).
 * Feature-local — see `sa-list-skeleton.tsx`'s promotion note.
 */
export interface SAListErrorProps {
  /** Already-translated message (the container maps the failure key). */
  message: string;
  onRetry: () => void;
}

export function SAListError({ message, onRetry }: SAListErrorProps) {
  const t = useTranslations("studentAbsences");
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[var(--edu-radius-card)] border border-edu-error/20 bg-card px-5 py-10 text-center shadow-card"
    >
      <AlertTriangle
        className="size-10 text-edu-error-text"
        aria-hidden="true"
      />
      <p className="font-bold text-foreground text-sm">{message}</p>
      <Button
        type="button"
        variant="outline"
        onClick={onRetry}
        className="min-h-11"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        {t("retry")}
      </Button>
    </div>
  );
}
