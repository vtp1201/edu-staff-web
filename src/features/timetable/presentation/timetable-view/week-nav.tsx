import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";
import { ReadOnlyBadge } from "./read-only-badge";

interface WeekNavProps {
  weekOffset: number;
  weekDates: readonly Date[];
  onChange: (offset: number) => void;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Parent-only week navigator (display-only — the mock returns the same week's
 * timetable regardless of offset; the offset only drives the header/date axis
 * + today highlight). Icon-only prev/next buttons carry `aria-label`.
 */
export function WeekNav({ weekOffset, weekDates, onChange }: WeekNavProps) {
  const t = useTranslations("timetableView");
  const range =
    weekDates.length === 6
      ? `${pad2(weekDates[0].getDate())}/${pad2(weekDates[0].getMonth() + 1)} – ${pad2(weekDates[5].getDate())}/${pad2(weekDates[5].getMonth() + 1)}/${weekDates[5].getFullYear()}`
      : "";
  const isThisWeek = weekOffset === 0;

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-edu-border bg-edu-card px-4 py-3 shadow-card">
      <button
        type="button"
        aria-label={t("prevWeek")}
        onClick={() => onChange(weekOffset - 1)}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-edu-border bg-edu-card text-edu-text-secondary outline-none hover:border-edu-text-muted focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:transition-colors"
      >
        <ChevronLeft className="size-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        disabled={isThisWeek}
        onClick={() => onChange(0)}
        className={cn(
          "inline-flex min-h-11 items-center rounded-lg border px-3.5 font-extrabold text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:transition-colors",
          isThisWeek
            ? "border-edu-primary-accessible bg-edu-primary-accessible text-white"
            : "border-edu-border bg-edu-card text-edu-text-primary hover:border-edu-text-muted",
        )}
      >
        {t("thisWeek")}
      </button>
      <button
        type="button"
        aria-label={t("nextWeek")}
        onClick={() => onChange(weekOffset + 1)}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-edu-border bg-edu-card text-edu-text-secondary outline-none hover:border-edu-text-muted focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:transition-colors"
      >
        <ChevronRight className="size-3.5" aria-hidden="true" />
      </button>
      <div className="ml-1.5 font-extrabold text-edu-text-primary text-sm tabular-nums">
        {range}
      </div>
      <div className="flex-1" />
      <ReadOnlyBadge />
    </div>
  );
}
