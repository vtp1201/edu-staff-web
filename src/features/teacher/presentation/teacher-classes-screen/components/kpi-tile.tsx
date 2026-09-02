"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/shared/utils";
import type { KpiTileVM } from "../teacher-classes-screen.i-vm";

export type KpiTileProps = Omit<KpiTileVM, "key">;

/** Tone → tile fill + value colour. A full-tile fill (not a pill), so this is a
 *  local map rather than a reuse of `statusToneClass()` — same convention as
 *  class-log's `statusBadgeTones`. Text tokens are the AA-safe variants. */
const TILE_TONE_CLASS: Record<KpiTileVM["tone"], string> = {
  neutral: "bg-muted text-edu-text-primary",
  warning: "bg-edu-warning/15 text-edu-warning-foreground",
  error: "bg-edu-error/15 text-edu-error-text",
};

/** One static KPI number + its label. Never interactive (plain `<div>`): it is
 *  a read-out, not a control, so it stays out of the tab order. */
export function KpiTile({ value, suffix, label, tone, isDemo }: KpiTileProps) {
  const t = useTranslations("teacherClasses");

  return (
    <div
      className={cn(
        "min-w-[110px] flex-1 rounded-[8px] px-3 py-2",
        TILE_TONE_CLASS[tone],
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-extrabold text-[15px] tabular-nums">
          {value}
          {suffix}
        </span>
        {isDemo && (
          <StatusBadge
            tone="muted"
            aria-label={t("card.kpi.demoLabel")}
            className="px-1.5 py-0 text-[9.5px] uppercase"
          >
            {/* The badge renders a plain <span> (role=generic), where an
                aria-label is not a reliable accessible name — so the meaning is
                ALSO carried by real text: the short pill is hidden from AT and
                the full wording is announced instead (A11Y-003). */}
            <span aria-hidden="true">{t("card.kpi.demoPill")}</span>
            <span className="sr-only">{t("card.kpi.demoLabel")}</span>
          </StatusBadge>
        )}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
