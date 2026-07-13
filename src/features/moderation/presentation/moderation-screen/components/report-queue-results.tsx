"use client";

import { CheckCircle2, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportEntity } from "../../../domain/entities/report.entity";
import type { ModerationFailure } from "../../../domain/failures/moderation.failure";
import { ReportCardList } from "./report-card";
import { ReportErrorBanner } from "./report-error-banner";
import { ReportTable } from "./report-table";

/** Exactly one visible at a time (FR-107 / AC-1927.6). */
export type QueueStatus =
  | "loading"
  | "empty-positive"
  | "empty-filtered"
  | "error"
  | "success";

export interface ReportQueueResultsProps {
  status: QueueStatus;
  reports: ReportEntity[];
  errorKey: ModerationFailure["type"] | null;
  errorRetryable: boolean;
  onRetry: () => void;
  onOpen: (reportId: string) => void;
}

export function ReportQueueResults({
  status,
  reports,
  errorKey,
  errorRetryable,
  onRetry,
  onOpen,
}: ReportQueueResultsProps) {
  const t = useTranslations("moderation");
  const tErrors = useTranslations("moderation.errors");

  if (status === "loading") {
    return (
      <output
        aria-busy="true"
        aria-label={t("title")}
        className="flex flex-col gap-2"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            className="h-16 w-full rounded-[var(--edu-radius-card)]"
          />
        ))}
      </output>
    );
  }

  if (status === "empty-positive") {
    return (
      <EmptyState
        icon={CheckCircle2}
        title={t("empty.positiveTitle")}
        body={t("empty.positiveBody")}
      />
    );
  }

  if (status === "empty-filtered") {
    return (
      <EmptyState
        icon={SearchX}
        title={t("empty.filteredTitle")}
        body={t("empty.filteredBody")}
      />
    );
  }

  if (status === "error") {
    return (
      <ReportErrorBanner
        title={t("errorTitle")}
        message={tErrors(errorKey ?? "network-error")}
        showRetry={errorRetryable}
        retryLabel={t("retry")}
        onRetry={onRetry}
      />
    );
  }

  return (
    <>
      <ReportTable reports={reports} onOpen={onOpen} />
      <ReportCardList reports={reports} onOpen={onOpen} />
    </>
  );
}
