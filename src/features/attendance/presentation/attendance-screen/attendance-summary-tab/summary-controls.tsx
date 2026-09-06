"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SummaryRangeKind } from "../../../domain/resolve-summary-range";
import type { SummaryControlsVM } from "./attendance-summary-tab.i-vm";

type Props = {
  value: SummaryControlsVM;
  /** `YYYY-MM` of the current month — the month input cannot go past it. */
  maxMonth: string;
  onChange: (next: Partial<SummaryControlsVM>) => void;
};

const RANGE_LABEL_ID = "att-summary-range-label";

/**
 * Range picker for the summary tab: a segmented `Tháng | Học kỳ | Cả năm` plus
 * the one secondary control the chosen segment needs (a month input, a term
 * select, or nothing for the whole year).
 *
 * The class filter is NOT repeated here — the screen's existing
 * `AttendanceFilters` (`?class=`) already owns it for all three tabs, and a
 * second class control would be a fork of the same state.
 *
 * Term/year are OMITTED (not disabled) when no academic calendar is readable:
 * a disabled control invites a click that can never work, while an absent one
 * plus the `noTerms` notice explains itself.
 */
export function SummaryControls({ value, maxMonth, onChange }: Props) {
  const t = useTranslations("attendance.summaryTab");
  const terms = value.availableTerms ?? [];
  const hasTerms = terms.length > 0;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
      <div className="space-y-1.5">
        <span
          id={RANGE_LABEL_ID}
          className="block font-bold text-muted-foreground text-xs uppercase tracking-wide"
        >
          {t("rangeLabel")}
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          aria-labelledby={RANGE_LABEL_ID}
          value={value.rangeKind}
          onValueChange={(next) => {
            // Radix answers "" when the active item is re-clicked; a range
            // filter has no "none" state, so that keystroke is a no-op.
            if (!next) return;
            onChange({ rangeKind: next as SummaryRangeKind });
          }}
        >
          <ToggleGroupItem value="month" className="min-h-11 px-4">
            {t("month")}
          </ToggleGroupItem>
          {hasTerms && (
            <ToggleGroupItem value="term" className="min-h-11 px-4">
              {t("term")}
            </ToggleGroupItem>
          )}
          {hasTerms && (
            <ToggleGroupItem value="year" className="min-h-11 px-4">
              {t("year")}
            </ToggleGroupItem>
          )}
        </ToggleGroup>
      </div>

      {value.rangeKind === "month" && (
        <div className="space-y-1.5">
          <Label htmlFor="att-summary-month">{t("monthLabel")}</Label>
          <Input
            id="att-summary-month"
            type="month"
            className="min-h-11"
            max={maxMonth}
            value={value.month}
            onChange={(e) => onChange({ month: e.target.value })}
          />
        </div>
      )}

      {value.rangeKind === "term" && hasTerms && (
        <div className="space-y-1.5">
          <Label htmlFor="att-summary-term">{t("termLabel")}</Label>
          <Select
            value={value.termId ?? ""}
            onValueChange={(termId) => onChange({ termId })}
          >
            <SelectTrigger id="att-summary-term" className="min-h-11 min-w-48">
              <SelectValue placeholder={t("termLabel")} />
            </SelectTrigger>
            <SelectContent>
              {terms.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {term.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
