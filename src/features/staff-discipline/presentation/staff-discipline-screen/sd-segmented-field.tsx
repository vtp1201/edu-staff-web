"use client";

import { useId } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/shared/utils";

/**
 * Segmented single-select form field — the design-spec shape for the two enum
 * fields of this screen (`violationsTab.createForm.fields[3]` severity,
 * `conductNotesTab.setForm.fields[0]` rating: `"type": "segmented (…)"`, matching
 * `design_src/edu/staff-discipline.jsx`'s 3-button flex group).
 *
 * Built on the canonical `ui/radio-group` `variant="segmented"` primitive
 * (US-E03.1) — Radix keeps `role="radiogroup"`/`role="radio"`, arrow-key nav and
 * the focus ring, so no ARIA is hand-rolled. Each segment's checked tint mirrors
 * the corresponding row badge tone (`SDSeverityBadge`/`SDRatingBadge`) and is
 * passed in as a LITERAL class string (Tailwind v4 cannot scan a computed one).
 *
 * The visible group label is wired via `aria-labelledby` (a `<label htmlFor>`
 * cannot point at a radiogroup), so the field keeps a programmatic name.
 * Feature-local for now (one screen) — promote to `components/shared/` on the
 * second consumer per component-organization.md.
 */
export interface SDSegmentedOption<T extends string> {
  value: T;
  label: string;
  /** `data-[state=checked]:*` tint literals mirroring the badge tone. */
  checkedClassName: string;
}

export interface SDSegmentedFieldProps<T extends string> {
  label: string;
  /** `""` = nothing selected yet (a fresh form). */
  value: T | "";
  options: readonly SDSegmentedOption<T>[];
  /** Already-translated field error; presence also drives `aria-invalid`. */
  errorMessage?: string;
  onChange: (value: T) => void;
}

export function SDSegmentedField<T extends string>({
  label,
  value,
  options,
  errorMessage,
  onChange,
}: SDSegmentedFieldProps<T>) {
  const labelId = useId();
  const errorId = useId();
  const invalid = Boolean(errorMessage);

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="font-bold text-foreground text-xs">
        {label}
      </span>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as T)}
        variant="segmented"
        aria-labelledby={labelId}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        className={cn("flex w-full flex-wrap", invalid && "border-edu-error")}
      >
        {options.map((option) => (
          <RadioGroupItem
            key={option.value}
            variant="segmented"
            value={option.value}
            className={cn(
              "flex-1 basis-24 justify-center text-center",
              option.checkedClassName,
            )}
          >
            {option.label}
          </RadioGroupItem>
        ))}
      </RadioGroup>
      {invalid && (
        <p id={errorId} className="font-semibold text-edu-error-text text-xs">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
