"use client";

import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";

export interface DetailPanelHeaderProps {
  /** Full descriptive back label (resolved i18n value). Used as the button text
   * AND its `aria-label` — the aria-label is never truncated even if the visible
   * text overflows. Callers MUST pass a non-empty string. */
  backLabel: string;
  /** Called on click / Enter / Space of the back button. The parent owns the
   * navigation consequence (close drawer, pop route, …). */
  onBack: () => void;
  /** Optional center-zone title. Truncates with ellipsis so it never displaces
   * the back button or actions zone. */
  title?: string;
  /**
   * Optional right-zone actions. Rendered as-is inside a `flex-shrink-0`
   * container. RESPONSIVE CONTRACT: this component does NOT collapse action
   * labels on mobile — that is the CALLER's responsibility. To hide an action's
   * text label below 768px while keeping its icon, the caller structures each
   * action button with an icon plus a label span using `sr-only md:not-sr-only`
   * (keeps the accessible name for screen readers on mobile, shows the visible
   * label from `md` up). Icon-only buttons in this slot MUST carry their own
   * `aria-label`.
   */
  actions?: ReactNode;
  className?: string;
}

/**
 * Canonical 3-zone detail-panel header:
 * `[back button, left] [title, center] [actions, right]`.
 *
 * Zero hardcoded strings — all display text arrives via props as resolved i18n
 * values. Back/actions zones are `flex-shrink-0`; the title wrapper is `min-w-0`
 * so a long title truncates instead of pushing the other zones out of view.
 */
export function DetailPanelHeader({
  backLabel,
  onBack,
  title,
  actions,
  className,
}: DetailPanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-border border-b bg-card px-4 py-3",
        className,
      )}
    >
      {/* Left zone — back button (never shrinks) */}
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        aria-label={backLabel}
        className="min-h-[44px] min-w-[44px] flex-shrink-0 text-edu-text-secondary"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        <span className="truncate">{backLabel}</span>
      </Button>

      {/* Center zone — optional title (truncates) */}
      {title ? (
        <div className="min-w-0 flex-1">
          <span className="block truncate text-center font-bold text-base text-foreground">
            {title}
          </span>
        </div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}

      {/* Right zone — optional actions (never shrinks) */}
      {actions ? (
        <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
