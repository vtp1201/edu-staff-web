import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";
import { SUBJECT_COLOR_CLASSES } from "./subject-color-tokens";
import type { LegendSubjectVm } from "./timetable-view.i-vm";

interface SubjectLegendProps {
  subjects: LegendSubjectVm[];
}

/** Legend of subjects actually present in the current week (dot + name). */
export function SubjectLegend({ subjects }: SubjectLegendProps) {
  const t = useTranslations("timetableView");
  if (subjects.length === 0) return null;

  return (
    <section
      aria-label={t("legendTitle")}
      className="flex flex-wrap items-center gap-3.5 rounded-xl border border-edu-border bg-edu-card px-5 py-3.5 shadow-card"
    >
      <h2 className="font-bold text-[11px] text-edu-text-secondary uppercase tracking-wide">
        {t("legendTitle")}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {subjects.map((s) => {
          const c = SUBJECT_COLOR_CLASSES[s.colorToken];
          return (
            <li
              key={s.subjectId}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-bold text-[11.5px]",
                c.bg,
                c.border,
                c.text,
              )}
            >
              <span
                aria-hidden="true"
                className={cn("size-2 rounded-full", c.dot)}
              />
              {s.subjectName}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
