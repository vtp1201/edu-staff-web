"use client";

import {
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type {
  TimetableShortcutsVm,
  UpcomingPeriodVm,
} from "./timetable-tab.i-vm";

export interface UpcomingPeriodPanelProps {
  /** `null` → "Không có tiết sắp tới" (AC's named empty state). */
  upcoming: UpcomingPeriodVm | null;
  /** Read from the SAME live maps the day grid writes, so a save on the left
   *  flips these chips immediately instead of going stale until a navigation. */
  isPrepared: boolean;
  isLogged: boolean;
  shortcuts: TimetableShortcutsVm;
}

/** Status line — icon + LABEL + state word, never colour alone (a11y). */
function StatusLine({
  done,
  label,
  yes,
  no,
}: {
  done: boolean;
  label: string;
  yes: string;
  no: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <Check className="size-3.5 text-edu-success-text" aria-hidden="true" />
      ) : (
        <Clock
          className="size-3.5 text-edu-warning-foreground"
          aria-hidden="true"
        />
      )}
      <span className="font-bold text-card-foreground">{label}:</span>
      <span
        className={
          done
            ? "font-bold text-edu-success-text"
            : "font-bold text-edu-warning-foreground"
        }
      >
        {done ? yes : no}
      </span>
    </div>
  );
}

/**
 * Aside: my next period + its đã/chưa chips + three shortcuts. Each shortcut is
 * a real `<Link>` covering the whole row (never a clickable `<div>`), with the
 * href already built server-side.
 */
export function UpcomingPeriodPanel({
  upcoming,
  isPrepared,
  isLogged,
  shortcuts,
}: UpcomingPeriodPanelProps) {
  const t = useTranslations("teacherClasses.hub.timetable.upcoming");

  const rows = [
    {
      href: shortcuts.teachingPlanHref,
      icon: ClipboardList,
      label: t("shortcuts.teachingPlan"),
      src: t("shortcuts.teachingPlanSrc"),
    },
    {
      href: shortcuts.attendanceHref,
      icon: UserCheck,
      label: t("shortcuts.attendance"),
      src: t("shortcuts.attendanceSrc"),
    },
    {
      href: shortcuts.classLogHref,
      icon: FileText,
      label: t("shortcuts.classLog"),
      src: t("shortcuts.classLogSrc"),
    },
  ];

  return (
    <aside className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <div className="border-border border-b px-4 py-3">
        <h3 className="font-extrabold text-card-foreground text-sm">
          {t("title")}
        </h3>
        <p className="mt-1 text-edu-text-secondary text-xs">
          {upcoming
            ? [
                t("meta", {
                  subject: upcoming.subjectName,
                  number: upcoming.periodNumber,
                  day: upcoming.dayLabel,
                }),
                upcoming.timeRangeLabel,
                upcoming.room,
              ]
                .filter(Boolean)
                .join(" · ")
            : t("none")}
        </p>
      </div>

      {upcoming && (
        <div className="flex flex-col gap-2 border-border border-b px-4 py-3">
          <StatusLine
            done={isPrepared}
            label={t("prep")}
            yes={t("prepared")}
            no={t("notPrepared")}
          />
          <StatusLine
            done={isLogged}
            label={t("log")}
            yes={t("logged")}
            no={t("notLogged")}
          />
        </div>
      )}

      <ul>
        {rows.map((row) => (
          <li key={row.href} className="border-border border-b last:border-b-0">
            <Link
              href={row.href}
              className="flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-edu-primary-light">
                <row.icon className="size-4 text-primary" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-card-foreground text-sm">
                  {row.label}
                </span>
                <span className="mt-0.5 block text-edu-text-secondary text-xs">
                  {row.src}
                </span>
              </span>
              <ChevronRight
                className="size-3.5 shrink-0 self-center text-edu-text-secondary"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>

      <p className="px-4 py-3 text-edu-text-secondary text-xs">{t("footer")}</p>
    </aside>
  );
}
