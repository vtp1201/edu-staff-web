"use client";

import { type Ref, useId } from "react";

/**
 * Labelled bare-date input (filter bar ×2, record dialog ×1). Feature-local —
 * no shared `DateField` primitive exists yet (component-architecture.md §0);
 * mirrors `audit-log`'s `date-range-fields.tsx` shape (own `useId`, literal
 * input class, `aria-invalid`/`aria-describedby` wiring).
 *
 * NEVER used in the edit dialog: the natural-key `date` renders as static text
 * there (`SAStaticField`), because AC-004.3 fails for an input of ANY kind,
 * including a disabled one (§1 decision 1).
 */
export interface SADateFieldProps {
  /** Already-i18n'd label. */
  label: string;
  /** Bare `YYYY-MM-DD`; `""` = unset. */
  value: string;
  onChange: (value: string) => void;
  /** The "today" bound (AC-003.1). */
  max?: string;
  /** Already-i18n'd; presence also drives `aria-invalid`. */
  errorMessage?: string;
  /**
   * Ref to the underlying `<input>` so the owner can return focus to the field
   * after a client-side validation failure (AC-003.3, WCAG 3.3.1).
   */
  inputRef?: Ref<HTMLInputElement>;
}

const INPUT_CLASS =
  "min-h-11 w-full rounded-[var(--edu-radius-btn)] border border-border bg-card px-3 font-semibold text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-edu-error";

export function SADateField({
  label,
  value,
  onChange,
  max,
  errorMessage,
  inputRef,
}: SADateFieldProps) {
  const inputId = useId();
  const errorId = useId();
  const invalid = Boolean(errorMessage);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor={inputId}
        className="font-bold text-edu-text-secondary text-xs uppercase tracking-wide"
      >
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="date"
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        className={INPUT_CLASS}
      />
      {invalid && (
        <p id={errorId} className="font-semibold text-edu-error-text text-xs">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
