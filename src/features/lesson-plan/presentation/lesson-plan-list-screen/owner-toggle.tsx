"use client";

import { cn } from "@/shared/utils";
import type { ListScope } from "../shared.i-vm";

export interface OwnerToggleProps {
  scope: ListScope;
  mineCount: number;
  publishedCount: number;
  onScopeChange: (scope: ListScope) => void;
  labels: { groupAriaLabel: string; mine: string; school: string };
}

/**
 * "Của tôi" / "Toàn trường" scope toggle (design listScreen.pageHeader.ownerToggle).
 * `role="group"` + per-option `aria-pressed` (AC a11y). Feature-local for now —
 * anticipated 2nd consumer is question-bank (promote on that story, decision 0026).
 */
export function OwnerToggle({
  scope,
  mineCount,
  publishedCount,
  onScopeChange,
  labels,
}: OwnerToggleProps) {
  const options: { id: ListScope; label: string; count: number }[] = [
    { id: "mine", label: labels.mine, count: mineCount },
    { id: "browse", label: labels.school, count: publishedCount },
  ];
  return (
    <fieldset className="flex overflow-hidden rounded-lg border border-border bg-card p-0">
      <legend className="sr-only">{labels.groupAriaLabel}</legend>
      {options.map((o) => {
        const active = scope === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onScopeChange(o.id)}
            className={cn(
              "inline-flex min-h-[44px] items-center gap-2 px-3.5 py-2 font-bold text-sm transition-colors",
              active
                ? "bg-primary/12 text-primary"
                : "text-edu-text-secondary hover:bg-muted",
            )}
          >
            {o.label}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-extrabold text-[10px]",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-edu-text-secondary",
              )}
            >
              {o.count}
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
