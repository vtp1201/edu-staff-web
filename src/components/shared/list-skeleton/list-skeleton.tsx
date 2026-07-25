import { Fragment, type ReactNode } from "react";
import { cn } from "@/shared/utils";

/**
 * Canonical list-loading placeholder (component-organization.md, decision 0026 —
 * consolidates `SDListSkeleton`/`SAListSkeleton`/`PLSkeleton`/
 * `InvitationsSkeleton`, INFRA-shared-list-states).
 *
 * The component owns ONLY the outer wrapper markup + a11y wiring per variant and
 * the `rows`-times loop. Row internals stay 100% caller-owned via `renderRow`,
 * which is the real per-screen variation (avatar or not, badge count,
 * hidden-on-mobile columns, trailing icon vs pill) — that's what lets one
 * component cover every list without forking.
 *
 * Presentation-only: callers pass an already-translated `loadingAriaLabel` (it
 * does NOT call `useTranslations`), so it stays framework-neutral.
 */
export interface ListSkeletonProps {
  /** Already-translated text announced to screen readers while the shimmer shows. */
  loadingAriaLabel: string;
  /** Row count (SD/SA use 4; parent-links/invitations use 5). */
  rows: number;
  /**
   * `inline` — the outer div itself is `role="status" aria-busy="true"`, rows
   * separated by `divide-y` inside a `shadow-card` card (SD/SA).
   * `bordered` — `rounded-xl border p-2` wrapper, a visually-hidden
   * `role="status"` sibling, rows inside an `aria-hidden` block (PL/invitations).
   */
  variant: "inline" | "bordered";
  /** Caller-owned per-row content; receives the row index. */
  renderRow: (index: number) => ReactNode;
  /** Merged onto the outer wrapper via cn() (per-screen padding/border overrides). */
  className?: string;
}

export function ListSkeleton({
  loadingAriaLabel,
  rows,
  variant,
  renderRow,
  className,
}: ListSkeletonProps) {
  const rowNodes = Array.from({ length: rows }, (_, index) => (
    // The row set is a fixed-length static shimmer — the index IS the identity.
    // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows, never reordered
    <Fragment key={index}>{renderRow(index)}</Fragment>
  ));

  if (variant === "inline") {
    return (
      <div
        role="status"
        aria-busy="true"
        className={cn(
          "divide-y divide-border overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card",
          className,
        )}
      >
        <span className="sr-only">{loadingAriaLabel}</span>
        {rowNodes}
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-xl border border-border bg-card p-2", className)}
    >
      <span className="sr-only" role="status">
        {loadingAriaLabel}
      </span>
      <div aria-hidden="true">{rowNodes}</div>
    </div>
  );
}
