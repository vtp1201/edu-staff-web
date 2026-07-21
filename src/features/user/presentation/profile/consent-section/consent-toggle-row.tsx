"use client";

import type { LucideIcon } from "lucide-react";
import { useId } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { ConsentCategory } from "@/features/parent-links/domain/repositories/i-parent-consent.repository";
import { cn } from "@/shared/utils";

export interface ConsentToggleRowProps {
  category: ConsentCategory;
  icon: LucideIcon;
  /** Already-translated label. */
  label: string;
  /** Already-translated 1-line description. */
  description: string;
  checked: boolean;
  /**
   * `true` when the child's consent has not yet resolved (AC-001.3) — renders a
   * Skeleton instead of a live Switch, so no guessed `aria-checked` is shown.
   */
  pending: boolean;
  /** `true` while THIS row's own toggle mutation is in flight (AC-006.4). */
  saving: boolean;
  /** Already-translated inline error text (revert path, AC-006.2). */
  errorText?: string;
  onCheckedChange: (next: boolean) => void;
}

/**
 * Fully-controlled presentational leaf — no data fetching, no `useTranslations`
 * (all strings arrive as props). `useId()` wires `aria-labelledby` /
 * `aria-describedby` at the switch pointing at the visible label + description
 * (NFR-001). The 44×44 touch target (NFR-003) is the wrapping hit-area cell,
 * not a Switch variant — the visual switch stays at its design-spec size.
 */
export function ConsentToggleRow({
  category,
  icon: Icon,
  label,
  description,
  checked,
  pending,
  saving,
  errorText,
  onCheckedChange,
}: ConsentToggleRowProps) {
  const labelId = useId();
  const descId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <span
          className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <span
            id={labelId}
            className="block text-[13px] font-bold text-foreground"
          >
            {label}
          </span>
          <p id={descId} className="mt-0.5 text-xs text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="grid min-h-[44px] min-w-[44px] shrink-0 place-items-center">
          {pending ? (
            <Skeleton
              className="h-[1.15rem] w-8 rounded-full"
              aria-hidden="true"
            />
          ) : (
            <Switch
              data-category={category}
              checked={checked}
              disabled={saving}
              aria-labelledby={labelId}
              aria-describedby={errorText ? `${descId} ${labelId}` : descId}
              onCheckedChange={onCheckedChange}
            />
          )}
        </div>
      </div>
      {errorText && (
        <p role="alert" className={cn("pl-[46px] text-xs text-edu-error-text")}>
          {errorText}
        </p>
      )}
    </div>
  );
}
