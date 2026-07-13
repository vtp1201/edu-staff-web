"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export interface LoadMoreButtonProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  /** True when the last "load more" failed — shows retry copy, keeps rows. */
  hasError?: boolean;
}

/** Cursor "load more" — removed from the DOM (not disabled) when !hasMore. */
export function LoadMoreButton({
  hasMore,
  isLoadingMore,
  onLoadMore,
  hasError = false,
}: LoadMoreButtonProps) {
  const t = useTranslations("moderation");
  if (!hasMore) return null;

  return (
    <div className="flex justify-center pt-2">
      <Button
        type="button"
        variant="outline"
        onClick={onLoadMore}
        disabled={isLoadingMore}
        aria-busy={isLoadingMore}
      >
        {hasError ? t("loadMoreError") : t("loadMore")}
      </Button>
    </div>
  );
}
