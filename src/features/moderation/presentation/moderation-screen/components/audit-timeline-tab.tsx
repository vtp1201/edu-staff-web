"use client";

import { Ban, Check, ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state/empty-state";
import { StatusBadge } from "@/components/shared/status-badge/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditEntryEntity } from "../../../domain/entities/audit-entry.entity";
import type { ModerationFailure } from "../../../domain/failures/moderation.failure";
import { formatReportTimestamp } from "./format-report-row";
import { ReportErrorBanner } from "./report-error-banner";

export type AuditStatus = "loading" | "empty" | "error" | "success";

export interface AuditTimelineTabProps {
  status: AuditStatus;
  entries: AuditEntryEntity[];
  errorKey: ModerationFailure["type"] | null;
  errorRetryable: boolean;
  onRetry: () => void;
}

const ACTION_ICON = { removed: Ban, dismissed: Check } as const;
const ACTION_TONE = { removed: "error", dismissed: "muted" } as const;

/**
 * Read-only audit timeline (UC-1929). NO action control anywhere in this
 * subtree (AC-1929.6) — enforced structurally: not a single button is rendered
 * for an entry. Action badges are icon+text (never color-only).
 */
export function AuditTimelineTab({
  status,
  entries,
  errorKey,
  errorRetryable,
  onRetry,
}: AuditTimelineTabProps) {
  const t = useTranslations("moderation");
  const tAudit = useTranslations("moderation.audit");
  const tErrors = useTranslations("moderation.errors");
  const tKind = useTranslations("moderation.kinds");

  if (status === "loading") {
    return (
      <output
        aria-busy="true"
        aria-label={t("tabs.audit")}
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

  if (status === "empty") {
    return <EmptyState icon={ClipboardList} title={tAudit("empty")} />;
  }

  return (
    <ol className="flex flex-col gap-2">
      {entries.map((entry) => {
        const Icon = ACTION_ICON[entry.action];
        return (
          <li
            key={entry.entryId}
            className="flex flex-col gap-1.5 rounded-[var(--edu-radius-card)] border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={ACTION_TONE[entry.action]} className="gap-1">
                <Icon aria-hidden="true" className="size-3" />
                {tAudit(`actionBadge.${entry.action}`)}
              </StatusBadge>
              <span className="font-medium text-foreground text-sm">
                {entry.actorName} {tAudit(`actionText.${entry.action}`)}
              </span>
              <span className="text-muted-foreground text-xs">
                · {tKind(entry.contentRef.kind)}
              </span>
              <span className="ml-auto whitespace-nowrap text-muted-foreground text-xs">
                {formatReportTimestamp(entry.timestamp)}
              </span>
            </div>
            {entry.reason && (
              <p className="text-edu-text-secondary text-xs">
                {tAudit("reasonPrefix")}: {entry.reason}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
