"use client";

import { useRef } from "react";
import { cn } from "@/shared/utils";

/** 6-cell numeric OTP input (design-spec: slot 46×52, radius 10). */
export function OtpInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  function setDigit(i: number, d: string) {
    const next = (value.slice(0, i) + d + value.slice(i + 1)).slice(0, 6);
    onChange(next.replace(/[^0-9]/g, ""));
    if (d && i < 5) refs.current[i + 1]?.focus();
  }

  return (
    <div className="flex justify-between gap-2">
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
          aria-label={`OTP digit ${i + 1}`}
          onChange={(e) => setDigit(i, e.target.value.slice(-1))}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          className={cn(
            "h-13 w-11.5 rounded-[10px] border border-border text-center text-xl font-extrabold text-foreground outline-none",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
          )}
        />
      ))}
    </div>
  );
}
