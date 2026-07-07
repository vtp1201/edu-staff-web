"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export interface LoadMoreButtonProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

/**
 * AC-7 — cursor "load more" control. Removed from the DOM (not disabled) when
 * !hasMore so it's not a dead tab-stop. aria-label is a full sentence distinct
 * from the short visible label (AC-12).
 */
export function LoadMoreButton({
  hasMore,
  isLoadingMore,
  onLoadMore,
}: LoadMoreButtonProps) {
  const t = useTranslations("auditLog.loadMore");

  if (!hasMore) return null;

  return (
    <div className="flex justify-center pt-2">
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
    </div>
  );
}
