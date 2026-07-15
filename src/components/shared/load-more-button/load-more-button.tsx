"use client";

import { Button } from "@/components/ui/button";

export interface LoadMoreButtonProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  /** Already-translated default label (caller owns i18n). */
  label: string;
  /** Already-translated label shown when the last "load more" failed. */
  errorLabel: string;
  /** True when the last "load more" failed — shows retry copy, keeps rows. */
  hasError?: boolean;
}

/**
 * Cursor "load more" control — canonical home (promoted from
 * `moderation-screen` on its 2nd caller, US-E19.1, per
 * component-organization.md "promote, don't copy"). Removed from the DOM (not
 * disabled) when `!hasMore` so it is never a dead tab-stop. `aria-busy` while a
 * fetch is in flight; `disabled` guards against double-submission. Labels are
 * props so any feature's i18n namespace can drive it.
 */
export function LoadMoreButton({
  hasMore,
  isLoadingMore,
  onLoadMore,
  label,
  errorLabel,
  hasError = false,
}: LoadMoreButtonProps) {
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
        {hasError ? errorLabel : label}
      </Button>
    </div>
  );
}
