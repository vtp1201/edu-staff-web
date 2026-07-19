import { Link2, SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export interface PLEmptyProps {
  variant: "no-filter" | "filtered";
  noFilterTitle: string;
  noFilterBody: string;
  noFilterCreateLabel: string;
  filteredTitle: string;
  filteredBody: string;
  filteredClearLabel: string;
  onOpenCreateDialog: () => void;
  onClearFilters: () => void;
}

/**
 * Two distinct empty variants (FR-008): no-filter (create CTA, AC-001.3) vs
 * filtered (clear-filters CTA, AC-001.4). Thin dispatcher over the shared
 * `EmptyState` — the container passes already-translated strings.
 */
export function PLEmpty({
  variant,
  noFilterTitle,
  noFilterBody,
  noFilterCreateLabel,
  filteredTitle,
  filteredBody,
  filteredClearLabel,
  onOpenCreateDialog,
  onClearFilters,
}: PLEmptyProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      {variant === "no-filter" ? (
        <EmptyState
          icon={Link2}
          title={noFilterTitle}
          body={noFilterBody}
          cta={{ label: noFilterCreateLabel, onClick: onOpenCreateDialog }}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title={filteredTitle}
          body={filteredBody}
          cta={{
            label: filteredClearLabel,
            variant: "secondary",
            onClick: onClearFilters,
          }}
        />
      )}
    </div>
  );
}
