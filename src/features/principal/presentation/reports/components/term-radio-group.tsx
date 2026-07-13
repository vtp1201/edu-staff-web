"use client";

import { useTranslations } from "next-intl";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Term } from "@/features/principal/domain/reports/entities/reports-summary.entity";

export interface TermRadioGroupProps {
  value: Term;
  onValueChange: (term: Term) => void;
}

const OPTIONS: { value: Term; labelKey: "hk1" | "hk2" | "fullYear" }[] = [
  { value: "HK1", labelKey: "hk1" },
  { value: "HK2", labelKey: "hk2" },
  { value: "FULL_YEAR", labelKey: "fullYear" },
];

/**
 * Term selector (FR-002). Wraps `ui/radio-group` with `variant="segmented"`;
 * native `role="radiogroup"`/`role="radio"`, arrow-key nav + focus ring
 * inherited from Radix (AC-01.6) — no hand-rolled ARIA.
 */
export function TermRadioGroup({ value, onValueChange }: TermRadioGroupProps) {
  const t = useTranslations("reports.toolbar");
  return (
    <RadioGroup
      variant="segmented"
      value={value}
      onValueChange={(v) => onValueChange(v as Term)}
      aria-label={t("termRadioGroupAriaLabel")}
    >
      {OPTIONS.map((o) => (
        <RadioGroupItem key={o.value} variant="segmented" value={o.value}>
          {t(`termOptions.${o.labelKey}`)}
        </RadioGroupItem>
      ))}
    </RadioGroup>
  );
}
