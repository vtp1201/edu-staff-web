"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { AuditLogFailure } from "../../../domain/failures/audit-log.failure";

export interface LoadMoreButtonProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  /**
   * Set when the LAST "load more" fetch failed. Renders an inline error +
   * retry affordance in place of the plain button WITHOUT unmounting the
   * already-loaded rows (AC-10). Presentational only — `onLoadMore` doubles as
   * the retry handler; the container owns the network logic.
   */
  errorKey?: AuditLogFailure["type"] | null;
}

/**
 * AC-7 — cursor "load more" control. Removed from the DOM (not disabled) when
 * !hasMore so it's not a dead tab-stop. aria-label is a full sentence distinct
 * from the short visible label (AC-12). On a load-more failure it shows an
 * inline error message + retry, keeping loaded rows visible (AC-10).
 */
export function LoadMoreButton({
  hasMore,
  isLoadingMore,
  onLoadMore,
  errorKey = null,
}: LoadMoreButtonProps) {
  const t = useTranslations("auditLog.loadMore");
  const te = useTranslations("auditLog.errors");

  if (!hasMore) return null;

  const showError = errorKey !== null && !isLoadingMore;

  return (
    <div className="flex flex-col items-center gap-2 pt-2">
      {showError ? (
        <>
          <p role="alert" className="text-edu-error-text text-sm">
            {te(errorKey)}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onLoadMore}
            aria-label={t("ariaLabel")}
          >
            {t("retry")}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={onLoadMore}
          disabled={isLoadingMore}
          aria-busy={isLoadingMore}
          aria-label={t("ariaLabel")}
        >
          {isLoadingMore ? t("loading") : t("label")}
        </Button>
      )}
    </div>
  );
}
