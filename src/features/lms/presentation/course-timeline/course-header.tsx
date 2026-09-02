"use client";

import { BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CourseItemState } from "@/features/lms/domain/entities/course-item.entity";
import { cn } from "@/shared/utils";
import { STATE_DOT_CLASS } from "../shared/item-state-pill";
import { TONE_TEXT_ACCESSIBLE, TONE_TINT } from "../tone";
import type { CourseTimelineVm } from "./course-timeline.i-vm";

const LEGEND: ReadonlyArray<{
  state: CourseItemState;
  key: "upcoming" | "open" | "closed";
}> = [
  { state: "UPCOMING_HIDDEN", key: "upcoming" },
  { state: "OPEN", key: "open" },
  { state: "CLOSED", key: "closed" },
];

export interface CourseHeaderProps {
  courseName: string;
  tone: CourseTimelineVm["tone"];
  openCount: number;
}

/**
 * Course identity + "N mục đang mở" + the 3-state legend.
 *
 * No teacher name: no student-callable LMS endpoint carries one (see
 * `course-timeline.i-vm.ts`) — an empty or invented line would be worse than
 * its absence.
 *
 * Legend labels are `text-muted-foreground`, not each status' own hue as the
 * mockup draws them: at 11px they are small text (≥4.5:1 required) and there is
 * no AA-safe `--edu-info-*-text` token. The coloured dot stays as decoration
 * beside the always-present word, so nothing is conveyed by colour alone
 * (WCAG 1.4.1) and no new token/ADR is needed.
 */
export function CourseHeader({
  courseName,
  tone,
  openCount,
}: CourseHeaderProps) {
  const t = useTranslations("courses");

  return (
    <div className="flex flex-wrap items-center gap-3.5 rounded-[var(--edu-radius-card)] border border-border bg-card px-5 py-4 shadow-card">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-[11px]",
          TONE_TINT[tone],
        )}
      >
        <BookOpen className={cn("size-5", TONE_TEXT_ACCESSIBLE[tone])} />
      </span>

      <div className="min-w-0 flex-1 basis-44">
        <h1 className="truncate font-extrabold text-base text-foreground">
          {courseName}
        </h1>
        <p className="mt-0.5 inline-flex items-center gap-1.5 font-bold text-edu-success-text text-xs">
          <span
            aria-hidden="true"
            className="size-[7px] rounded-full bg-edu-success-text"
          />
          {t("timeline.header.openCount", { count: openCount })}
        </p>
      </div>

      <ul
        aria-label={t("timeline.legendLabel")}
        className="flex flex-wrap gap-2.5"
      >
        {LEGEND.map((entry) => (
          <li
            key={entry.key}
            className="inline-flex items-center gap-1.5 font-bold text-[11px] text-muted-foreground"
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-[7px] rounded-full",
                STATE_DOT_CLASS[entry.state],
              )}
            />
            {t(`timeline.legend.${entry.key}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
