"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/shared/utils";
import type { StudentAttendanceSummary } from "../../../domain/entities/student-attendance-summary.entity";
import { BAND_DOT_CLASS, BAND_TEXT_CLASS } from "./summary-bands";

type Props = {
  students: StudentAttendanceSummary[];
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(-2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * "Cảnh báo chuyên cần" aside: `risk` students first, then `watch` — the order
 * IS the priority, so the teacher reads the most urgent name first.
 *
 * The mockup's "Báo PH" button is deliberately NOT rendered: there is no BE
 * endpoint to notify a parent about attendance (packet Harness Delta ask (a)).
 * A button that silently does nothing is worse than no button; the ask is
 * tracked instead.
 *
 * Students with no rate never appear here — "we have not marked them" is not an
 * attendance risk, and listing them would drown the real ones.
 */
export function AlertsPanel({ students }: Props) {
  const t = useTranslations("attendance.summaryTab");

  const risk = students.filter((s) => s.band === "risk");
  const watch = students.filter((s) => s.band === "watch");
  const alerts = [...risk, ...watch];

  return (
    <section
      aria-labelledby="att-summary-alerts-title"
      className="rounded-[var(--edu-radius-card)] border border-border bg-card p-5 shadow-card"
    >
      <h3
        id="att-summary-alerts-title"
        className="mb-3 font-bold text-[13px] text-foreground"
      >
        {t("alertsTitle")}
      </h3>

      {alerts.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t("noAlerts")}</p>
      ) : (
        <ul className="divide-y divide-border">
          {alerts.map((student) => {
            // `band` is non-null here: both filters above selected on it.
            const band = student.band === "risk" ? "risk" : "watch";
            return (
              <li
                key={student.studentId}
                className="flex items-center gap-2.5 py-2.5"
              >
                <Avatar className="size-7 shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-[10px] text-foreground",
                      band === "risk" ? "bg-edu-error/15" : "bg-edu-warning/15",
                    )}
                  >
                    {initialsOf(student.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[12.5px] text-foreground">
                    {student.name}
                  </p>
                  <p
                    className={cn(
                      "flex items-center gap-1.5 font-semibold text-[11px]",
                      BAND_TEXT_CLASS[band],
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        BAND_DOT_CLASS[band],
                      )}
                    />
                    {student.rate}% ·{" "}
                    {band === "risk"
                      ? t("unexcusedDays", { count: student.absent })
                      : t("watchNote")}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
