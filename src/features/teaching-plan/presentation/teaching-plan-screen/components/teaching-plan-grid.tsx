"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/shared/utils";
import type { PlanCellVM } from "../teaching-plan-screen.i-vm";
import { type PlanCellDraft, PlanCellForm } from "./plan-cell-form";

type Props = {
  weeks: number;
  periodsPerWeek: number;
  cells: PlanCellVM[];
  /** When false (not DRAFT/REJECTED), cells are read-only. */
  editable: boolean;
  isPending: boolean;
  onSaveCell: (draft: PlanCellDraft) => void;
};

function cellKey(week: number, period: number): string {
  return `${week}-${period}`;
}

export function TeachingPlanGrid({
  weeks,
  periodsPerWeek,
  cells,
  editable,
  isPending,
  onSaveCell,
}: Props) {
  const t = useTranslations("teachingPlan");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const byKey = new Map<string, PlanCellVM>();
  for (const c of cells) {
    byKey.set(cellKey(c.week, c.period), c);
  }

  const weekRows = Array.from({ length: weeks }, (_, i) => i + 1);
  const periodCols = Array.from({ length: periodsPerWeek }, (_, i) => i + 1);

  const handleSave = (draft: PlanCellDraft) => {
    onSaveCell(draft);
    setOpenKey(null);
  };

  return (
    <div className="overflow-x-auto rounded-[var(--edu-radius-card)] border border-border bg-card">
      {/* Use a real <table> for semantic grid — satisfies biome useSemanticElements
          and gives screen readers proper col/row header associations. */}
      <table className="min-w-max border-collapse">
        <thead>
          <tr className="border-border border-b bg-muted/40">
            <th
              scope="col"
              className="sticky left-0 z-10 w-24 bg-muted/40 px-3 py-2 text-left font-bold text-muted-foreground text-xs uppercase tracking-wide"
            >
              {t("selector.term")}
            </th>
            {periodCols.map((period) => (
              <th
                key={period}
                scope="col"
                className="w-40 px-3 py-2 text-center font-bold text-muted-foreground text-xs uppercase tracking-wide"
              >
                {t("grid.periodLabel", { period })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weekRows.map((week) => (
            <tr key={week} className="border-border border-b last:border-b-0">
              <th
                scope="row"
                className="sticky left-0 z-10 w-24 bg-card px-3 py-2 text-left font-semibold text-foreground text-sm"
              >
                {t("grid.weekLabel", { week })}
              </th>
              {periodCols.map((period) => {
                const key = cellKey(week, period);
                const cell = byKey.get(key);
                const isOpen = openKey === key;

                if (!editable) {
                  return (
                    <td
                      key={period}
                      className="w-40 border-border border-l px-3 py-2 align-top"
                    >
                      {cell ? (
                        <span className="line-clamp-2 text-foreground text-sm">
                          {cell.title}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  );
                }

                return (
                  <td key={period} className="w-40 border-border border-l p-1">
                    <Popover
                      open={isOpen}
                      onOpenChange={(o) => setOpenKey(o ? key : null)}
                    >
                      <PopoverTrigger asChild>
                        {cell ? (
                          <button
                            type="button"
                            className={cn(
                              "flex h-full min-h-12 w-full items-start rounded-md px-2 py-1.5 text-left text-foreground text-sm transition-colors",
                              "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            )}
                          >
                            <span className="line-clamp-2">{cell.title}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label={t("grid.addCell", { week, period })}
                            className={cn(
                              "flex h-full min-h-12 w-full items-center justify-center rounded-md border border-border border-dashed text-muted-foreground transition-colors",
                              "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            )}
                          >
                            <Plus className="size-4" aria-hidden="true" />
                          </button>
                        )}
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <PlanCellForm
                          week={week}
                          period={period}
                          initial={cell}
                          isPending={isPending}
                          onSave={handleSave}
                          onCancel={() => setOpenKey(null)}
                        />
                      </PopoverContent>
                    </Popover>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
