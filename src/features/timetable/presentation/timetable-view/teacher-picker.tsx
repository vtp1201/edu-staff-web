import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import type { PrincipalTeacher } from "@/features/principal/domain/teachers/entities/principal-teacher.entity";
import { cn } from "@/shared/utils";

interface TeacherPickerProps {
  teacherList: PrincipalTeacher[];
  selectedTeacherId: string;
  onSelect: (teacherId: string) => void;
  disabled?: boolean;
}

/** 2-char initials — `displayName` is always populated (no fallback branch). */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(-2)
    .join("")
    .toUpperCase();
}

/**
 * Principal-only card picker (US-E15.3) — sibling of `child-picker.tsx`, same
 * a11y shape (fieldset/legend, real `<button>` cards, `aria-pressed`, ≥44px
 * target, visible focus ring) but driven by `PrincipalTeacher`:
 * - no color-identity ring (teachers have no color token) → the neutral
 *   initials avatar already used on `principal-teachers-screen.tsx`;
 * - no ordinal name fallback (`displayName` has no documented gap);
 * - `ON_LEAVE` is surfaced with the SAME `StatusBadge tone="warning"`
 *   convention that screen established. `ON_LEAVE` teachers stay SELECTABLE —
 *   a principal legitimately reads an on-leave teacher's published week
 *   (coverage/handover), and the roster table does not disable them either.
 *   `ACTIVE` gets no badge (card density; only the exception is called out).
 */
export function TeacherPicker({
  teacherList,
  selectedTeacherId,
  onSelect,
  disabled,
}: TeacherPickerProps) {
  const t = useTranslations("timetableView");
  return (
    <fieldset className="flex flex-wrap gap-3 border-0 p-0">
      <legend className="sr-only">{t("teacherPickerLabel")}</legend>
      {teacherList.map((teacher) => {
        const active = teacher.teacherId === selectedTeacherId;
        return (
          <button
            key={teacher.teacherId}
            type="button"
            aria-pressed={active}
            // A11Y-001: only the OTHER cards go inert while the fetch runs.
            // A `disabled` element cannot hold focus, so disabling the card the
            // user just activated with the keyboard would yank focus to
            // `<body>` mid-interaction. The active card stays enabled (and
            // `onSelectTeacher` no-ops on the already-selected id).
            disabled={disabled && !active}
            onClick={() => onSelect(teacher.teacherId)}
            className={cn(
              "flex min-h-11 min-w-[240px] items-center gap-2.5 rounded-lg border-2 px-4 py-3 text-left",
              "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              "motion-safe:transition-colors disabled:pointer-events-none disabled:opacity-60",
              active
                ? "border-edu-primary bg-edu-primary/10"
                : "border-edu-border bg-edu-card hover:border-edu-text-muted",
            )}
          >
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-edu-text-primary text-xs"
            >
              {initials(teacher.displayName)}
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-edu-text-primary text-sm">
                {teacher.displayName}
              </span>
              <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-edu-text-secondary">
                {teacher.homeroomClassName
                  ? t("classLabel", { className: teacher.homeroomClassName })
                  : t("homeroomPending")}
                {teacher.status === "ON_LEAVE" && (
                  <StatusBadge tone="warning">{t("statusOnLeave")}</StatusBadge>
                )}
              </span>
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
