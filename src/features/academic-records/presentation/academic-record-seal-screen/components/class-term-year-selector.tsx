"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Term } from "../../../domain/entities/seal-batch.entity";
import type { ClassOption } from "../academic-record-seal-screen.i-vm";

export interface ClassTermYearSelectorProps {
  year: string;
  term: Term;
  classId: string | null;
  classOptions: ClassOption[];
  isClassOptionsLoading: boolean;
  onYearChange: (year: string) => void;
  onTermChange: (term: Term) => void;
  onClassChange: (classId: string) => void;
}

const YEARS = ["2025-2026", "2024-2025"] as const;

export function ClassTermYearSelector({
  year,
  term,
  classId,
  classOptions,
  isClassOptionsLoading,
  onYearChange,
  onTermChange,
  onClassChange,
}: ClassTermYearSelectorProps) {
  const t = useTranslations("academicRecordSeal.selector");
  const yearId = useId();
  const termId = useId();
  const classFieldId = useId();

  return (
    <div className="grid grid-cols-1 items-end gap-4 rounded-xl border border-border bg-card p-4 shadow-card sm:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor={yearId}
          className="text-edu-text-muted text-xs uppercase tracking-wide"
        >
          {t("year")}
        </Label>
        <Select value={year} onValueChange={onYearChange}>
          <SelectTrigger id={yearId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={y}>
                {y.replace("-", " — ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor={termId}
          className="text-edu-text-muted text-xs uppercase tracking-wide"
        >
          {t("term")}
        </Label>
        <Select value={term} onValueChange={(v) => onTermChange(v as Term)}>
          <SelectTrigger id={termId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HK1">{t("term1")}</SelectItem>
            <SelectItem value="HK2">{t("term2")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor={classFieldId}
          className="text-edu-text-muted text-xs uppercase tracking-wide"
        >
          {t("class")}
        </Label>
        <Select
          value={classId ?? ""}
          onValueChange={onClassChange}
          disabled={isClassOptionsLoading || classOptions.length === 0}
        >
          <SelectTrigger id={classFieldId} className="w-full">
            <SelectValue placeholder={t("classPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {classOptions.map((c) => (
              <SelectItem key={c.classId} value={c.classId}>
                {c.className}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
