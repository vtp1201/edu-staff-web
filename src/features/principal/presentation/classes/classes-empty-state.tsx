"use client";

import { Button } from "@/components/ui/button";

export interface ClassesEmptyStateProps {
  /**
   * `zero-tenant` = the school genuinely has no classes (AC-1.4, no clear
   * -filters affordance). `zero-filtered` = filters excluded every loaded row
   * (AC-1.5, clear-filters required).
   */
  variant: "zero-tenant" | "zero-filtered";
  message: string;
  clearFiltersLabel?: string;
  onClearFilters?: () => void;
}

export function ClassesEmptyState({
  variant,
  message,
  clearFiltersLabel,
  onClearFilters,
}: ClassesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-border bg-card p-10 text-center shadow-card">
      <p className="text-muted-foreground text-sm" role="status">
        {message}
      </p>
      {variant === "zero-filtered" && clearFiltersLabel && onClearFilters && (
        <Button onClick={onClearFilters} type="button" variant="outline">
          {clearFiltersLabel}
        </Button>
      )}
    </div>
  );
}
