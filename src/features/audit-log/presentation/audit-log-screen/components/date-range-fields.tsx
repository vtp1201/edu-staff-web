"use client";

import { useTranslations } from "next-intl";
import { useId, useMemo } from "react";

export interface DateRangeFieldsProps {
  from?: string;
  to?: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

const INPUT_CLASS =
  "min-h-11 rounded-[var(--edu-radius-btn)] border border-border bg-card px-3 text-foreground text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-edu-error";

/**
 * Date range filter fields with `from <= to` validation (US-E12.12, AC-12).
 * The invalid state is a real derived boolean (useMemo over props) — wired to
 * aria-invalid + aria-describedby on the "to" field with a visible error, never
 * a hardcoded null (prior-story a11y finding).
 */
export function DateRangeFields({
  from,
  to,
  onFromChange,
  onToChange,
}: DateRangeFieldsProps) {
  const t = useTranslations("auditLog.filters");
  const fromId = useId();
  const toId = useId();
  const errorId = useId();

  const invalid = useMemo(() => Boolean(from && to && from > to), [from, to]);

  return (
    <div className="flex flex-wrap items-start gap-3">
      <label htmlFor={fromId} className="flex flex-col gap-1">
        <span className="font-bold text-edu-text-secondary text-xs uppercase tracking-wide">
          {t("dateFrom")}
        </span>
        <input
          id={fromId}
          type="date"
          value={from ?? ""}
          onChange={(e) => onFromChange(e.target.value)}
          className={INPUT_CLASS}
        />
      </label>
      <label htmlFor={toId} className="flex flex-col gap-1">
        <span className="font-bold text-edu-text-secondary text-xs uppercase tracking-wide">
          {t("dateTo")}
        </span>
        <input
          id={toId}
          type="date"
          value={to ?? ""}
          onChange={(e) => onToChange(e.target.value)}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          className={INPUT_CLASS}
        />
        {invalid && (
          <span id={errorId} className="text-edu-error-text text-xs">
            {t("dateRangeError")}
          </span>
        )}
      </label>
    </div>
  );
}
