import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Award, Bell, CalendarX, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/utils";
import type { ParentStudentConsent } from "../../domain/entities/parent-student-consent.entity";

export interface PLConsentDetailSectionProps {
  status: "loading" | "error" | "success";
  data?: ParentStudentConsent;
  errorMessage?: string;
  onRetry: () => void;
  labels: {
    sectionTitle: string;
    disciplineAlerts: string;
    absenceAlerts: string;
    gradeAlerts: string;
    onLabel: string;
    offLabel: string;
    loadingLabel: string;
    retryLabel: string;
  };
}

const CATEGORY_ICON: Record<
  keyof Omit<ParentStudentConsent, "studentId" | "parentId">,
  LucideIcon
> = {
  disciplineAlerts: Shield,
  absenceAlerts: CalendarX,
  gradeAlerts: Award,
};

/**
 * Consent-detail sub-section of the detail dialog (INT-004). Owns its OWN
 * loading/error state scoped to this region only (AC-004.3/.4) — never blocks
 * the rest of the dialog. Read-only (FR-012). `role="status"`/`role="alert"`
 * scoped locally.
 */
export function PLConsentDetailSection({
  status,
  data,
  errorMessage,
  onRetry,
  labels,
}: PLConsentDetailSectionProps) {
  return (
    <section className="mt-2 border-border border-t pt-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Bell className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <p className="font-bold text-edu-text-secondary text-xs uppercase tracking-wide">
          {labels.sectionTitle}
        </p>
      </div>

      {status === "loading" && (
        <div role="status" className="flex flex-col gap-2">
          <span className="sr-only">{labels.loadingLabel}</span>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="flex items-center gap-2.5"
            >
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="flex flex-col items-start gap-2 rounded-lg bg-edu-error/10 px-3 py-2.5"
        >
          <p className="flex items-start gap-1.5 text-edu-error-text text-sm">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            {errorMessage}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            {labels.retryLabel}
          </Button>
        </div>
      )}

      {status === "success" && data && (
        <ul className="flex flex-col gap-1.5">
          {(
            [
              ["disciplineAlerts", labels.disciplineAlerts],
              ["absenceAlerts", labels.absenceAlerts],
              ["gradeAlerts", labels.gradeAlerts],
            ] as const
          ).map(([key, label]) => {
            const on = data[key];
            const Icon = CATEGORY_ICON[key];
            return (
              <li key={key} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    on ? "bg-primary/12" : "bg-muted",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      on ? "text-primary" : "text-muted-foreground",
                    )}
                    aria-hidden="true"
                  />
                </span>
                <span className="flex-1 text-foreground text-sm">{label}</span>
                <span
                  className={cn(
                    "font-bold text-xs",
                    on ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {on ? labels.onLabel : labels.offLabel}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
