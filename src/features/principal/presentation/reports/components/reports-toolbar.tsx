"use client";

import { Download, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Term } from "@/features/principal/domain/reports/entities/reports-summary.entity";
import { cn } from "@/shared/utils";
import { TermRadioGroup } from "./term-radio-group";

export interface ReportsToolbarProps {
  term: Term;
  onTermChange: (term: Term) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  /** Omit the whole Export Excel button (not disable) when undefined (D-3). */
  onExportExcel?: () => void;
  isExporting?: boolean;
}

/** Term selector + refresh + export (D-4: "New report" is NOT here). */
export function ReportsToolbar({
  term,
  onTermChange,
  isRefreshing,
  onRefresh,
  onExportExcel,
  isExporting = false,
}: ReportsToolbarProps) {
  const t = useTranslations("reports.toolbar");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <TermRadioGroup value={term} onValueChange={onTermChange} />
      <div className="flex-1" />
      <Button
        variant="secondary"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-busy={isRefreshing}
        aria-label={isRefreshing ? t("refreshingAria") : undefined}
      >
        <RefreshCw
          className={cn("size-4", isRefreshing && "motion-safe:animate-spin")}
          aria-hidden="true"
        />
        {t("refresh")}
      </Button>
      {onExportExcel && (
        <Button
          size="sm"
          onClick={onExportExcel}
          disabled={isExporting}
          aria-busy={isExporting}
        >
          <Download className="size-4" aria-hidden="true" />
          {t("exportExcel")}
        </Button>
      )}
    </div>
  );
}
