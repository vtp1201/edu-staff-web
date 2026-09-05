"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { StatCard, type StatTone } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { AttendanceTodayCardVm } from "./homeroom-tab.i-vm";

export interface AttendanceTodayCardProps {
  vm: AttendanceTodayCardVm;
}

const TILES = [
  { key: "present", labelKey: "present", tone: "success" },
  { key: "excused", labelKey: "excused", tone: "warning" },
  { key: "absent", labelKey: "absent", tone: "error" },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<AttendanceTodayCardVm, "present" | "excused" | "absent">;
  labelKey: string;
  tone: StatTone;
}>;

/**
 * "Điểm danh hôm nay" (US-E24.11). Purely presentational — its only interactive
 * element is a link; every number arrives pre-tallied from the server VM.
 *
 * The three tiles read "—" purely off `vm.taken`, NEVER off the numbers being
 * zero: a class that was rolled and had nobody absent must show a real `0`, not
 * the "chưa điểm danh" marker. The badge carries the same fact as text (not
 * colour alone) and each "—" gets an `sr-only` explanation so a screen reader
 * never announces a bare em-dash.
 */
export function AttendanceTodayCard({ vm }: AttendanceTodayCardProps) {
  const t = useTranslations("teacherClasses.hub.homeroom.attendance");

  return (
    <section className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-border border-b px-5 py-3.5">
        <h3 className="font-extrabold text-foreground text-sm">{t("title")}</h3>
        <StatusBadge tone={vm.taken ? "success" : "warning"}>
          {vm.taken ? t("taken") : t("notTaken")}
        </StatusBadge>
      </div>

      <div className="grid grid-cols-3 gap-2.5 px-5 py-4">
        {TILES.map((tile) => (
          <StatCard
            key={tile.key}
            variant="compact"
            label={t(tile.labelKey)}
            tone={tile.tone}
            value={vm.taken ? String(vm[tile.key]) : "—"}
          />
        ))}
      </div>
      {!vm.taken && <p className="sr-only">{t("notTakenHint")}</p>}

      <div className="px-5 pb-5">
        <Button asChild variant="outline" className="w-full">
          <Link href={vm.attendanceHref}>{t("openLink")}</Link>
        </Button>
      </div>
    </section>
  );
}
