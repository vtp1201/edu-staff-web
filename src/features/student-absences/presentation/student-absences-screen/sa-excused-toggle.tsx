"use client";

import { useId } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/shared/utils";

/**
 * 2-value segmented control for the boolean `excused` field.
 *
 * Built on the canonical `ui/radio-group` `variant="segmented"` primitive (same
 * underlying usage as `sd-segmented-field.tsx`, specialised for a boolean instead
 * of a generic string union) — Radix keeps `role="radiogroup"`/`role="radio"`,
 * arrow-key navigation and the focus ring, so no ARIA is hand-rolled and each
 * segment is ≥44px tall (NFR-003).
 *
 * The visible group label is wired via `aria-labelledby` (a `<label htmlFor>`
 * cannot point at a radiogroup), so the field keeps a programmatic name.
 * Checked tints are LITERAL class strings mirroring `SAExcusedBadge`'s tones
 * (Tailwind v4 cannot scan a computed class).
 */
export interface SAExcusedToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  /** Already-i18n'd "Có phép". */
  labelExcused: string;
  /** Already-i18n'd "Không phép". */
  labelUnexcused: string;
  disabled?: boolean;
}

export function SAExcusedToggle({
  label,
  value,
  onChange,
  labelExcused,
  labelUnexcused,
  disabled,
}: SAExcusedToggleProps) {
  const labelId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <span
        id={labelId}
        className="font-bold text-edu-text-secondary text-xs uppercase tracking-wide"
      >
        {label}
      </span>
      <RadioGroup
        value={value ? "true" : "false"}
        onValueChange={(next) => onChange(next === "true")}
        variant="segmented"
        aria-labelledby={labelId}
        disabled={disabled}
        className="flex w-full flex-wrap"
      >
        <RadioGroupItem
          variant="segmented"
          value="true"
          className={cn(
            "flex-1 basis-24 justify-center text-center",
            "data-[state=checked]:bg-edu-success/15 data-[state=checked]:text-edu-success-text",
          )}
        >
          {labelExcused}
        </RadioGroupItem>
        <RadioGroupItem
          variant="segmented"
          value="false"
          className={cn(
            "flex-1 basis-24 justify-center text-center",
            "data-[state=checked]:bg-edu-warning/15 data-[state=checked]:text-edu-warning-foreground",
          )}
        >
          {labelUnexcused}
        </RadioGroupItem>
      </RadioGroup>
    </div>
  );
}
