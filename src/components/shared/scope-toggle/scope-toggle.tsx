"use client";

import { cn } from "@/shared/utils";

export interface ScopeToggleOption<T extends string = string> {
  id: T;
  label: string;
  count: number;
}

export interface ScopeToggleProps<T extends string = string> {
  /** The currently-active option id. */
  value: T;
  /** The 2 (or more) scope options, each with a label + count badge. */
  options: readonly ScopeToggleOption<T>[];
  onChange: (value: T) => void;
  /** Screen-reader label for the whole toggle group. */
  groupAriaLabel: string;
}

/**
 * Generic 2-option scope toggle — `role="group"` (fieldset+legend) with a
 * per-option `aria-pressed` button and a count badge (design listScreen
 * pageHeader toggle pattern).
 *
 * Promoted from `features/lesson-plan/presentation/lesson-plan-list-screen/
 * owner-toggle.tsx` (US-E11.9, component-organization.md decision 0026) —
 * `question-bank` (mine/search) is the 2nd consumer; `lesson-plan`
 * (mine/school) is the 1st. Generalized: option ids/labels/counts are all
 * caller-supplied so the component carries zero feature-domain import.
 */
export function ScopeToggle<T extends string = string>({
  value,
  options,
  onChange,
  groupAriaLabel,
}: ScopeToggleProps<T>) {
  return (
    <fieldset className="flex overflow-hidden rounded-lg border border-border bg-card p-0">
      <legend className="sr-only">{groupAriaLabel}</legend>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.id)}
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
