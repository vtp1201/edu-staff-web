"use client";

import { useRef } from "react";
import { cn } from "@/shared/utils";

export interface OtpInputProps {
  /** Controlled value, digits only, length 0-6. */
  value: string;
  onChange: (value: string) => void;
  /** Per-cell aria-label, e.g. (n) => `Chữ số thứ ${n}` (1-indexed). Both real
   *  callers pass one; the default is back-compat only. */
  digitAriaLabel?: (n: number) => string;
  /** aria-label on the `role="group"` wrapper, e.g. "Mã xác thực 6 chữ số". */
  groupAriaLabel?: string;
  /** id of the element describing the error (linked via aria-describedby on the
   *  group wrapper). Only meaningful when `error` is true. */
  describedById?: string;
  /** Visual + a11y error state (border/bg/text error tokens + aria-invalid). */
  error?: boolean;
  /** All 6 cells non-interactive (UC-006 lockout) — cells keep their value. */
  disabled?: boolean;
}

/** 6-cell numeric OTP input (design-spec: slot 46×52, radius 10). */
export function OtpInput({
  value,
  onChange,
  digitAriaLabel,
  groupAriaLabel,
  describedById,
  error,
  disabled,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  function setDigit(i: number, d: string) {
    const next = (value.slice(0, i) + d + value.slice(i + 1)).slice(0, 6);
    onChange(next.replace(/[^0-9]/g, ""));
    if (d && i < 5) refs.current[i + 1]?.focus();
  }

  return (
    // <fieldset> has an implicit role="group" (avoids Biome's
    // useSemanticElements on a div); styling reset to a plain flex row.
    <fieldset
      aria-label={groupAriaLabel}
      aria-invalid={error || undefined}
      aria-describedby={error ? describedById : undefined}
      className="m-0 flex min-w-0 justify-between gap-1 border-0 p-0 sm:gap-2"
    >
      {digits.map((d, i) => (
        <input
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length OTP cells
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={digitAriaLabel?.(i + 1) ?? `OTP digit ${i + 1}`}
          aria-invalid={error || undefined}
          onChange={(e) => setDigit(i, e.target.value.slice(-1))}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          className={cn(
            // Mobile-first: shrink cells/gap so 6 cells fit a 320px viewport
            // (AC-003.7/NFR-005); restore the canonical 46×52 design-spec size
            // at ≥sm (design-spec.jsonc emailVerify.dialog.otpInput baseline).
            "h-11 w-8 rounded-[10px] border text-center text-lg font-extrabold outline-none disabled:cursor-not-allowed disabled:opacity-70 sm:h-13 sm:w-11.5 sm:text-xl",
            error
              ? "border-edu-error-dark bg-edu-error-dark-light/55 text-edu-error-text focus:border-edu-error-dark focus:ring-2 focus:ring-edu-error-dark/20"
              : "border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20",
          )}
        />
      ))}
    </fieldset>
  );
}
