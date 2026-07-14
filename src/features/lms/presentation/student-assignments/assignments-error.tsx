import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export interface AssignmentsErrorProps {
  /** True while a retry fetch is in flight — disables the button so a second
   *  click can't stack a concurrent retry (AC-1179 family). */
  isRetrying: boolean;
  onRetry: () => void;
}

/** Inline list-level error with a guarded "Thử lại" retry. */
export function AssignmentsError({
  isRetrying,
  onRetry,
}: AssignmentsErrorProps) {
  const t = useTranslations("assignments.error");
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[var(--edu-radius-card)] border border-border bg-card px-5 py-10 text-center shadow-card"
    >
      <AlertCircle className="size-10 text-edu-error-text" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-bold text-base text-foreground">{t("title")}</p>
        <p className="text-edu-text-secondary text-sm">{t("description")}</p>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        aria-busy={isRetrying}
      >
        {t("retry")}
      </Button>
    </div>
  );
}
