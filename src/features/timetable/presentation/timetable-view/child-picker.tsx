import { useTranslations } from "next-intl";
import type { TimetableChild } from "@/features/timetable/domain/entities/timetable-child.entity";
import { cn } from "@/shared/utils";
import { CHILD_COLOR_CLASSES } from "./subject-color-tokens";

interface ChildPickerProps {
  childList: TimetableChild[];
  selectedChildId: string;
  onSelect: (childId: string) => void;
  disabled?: boolean;
}

/**
 * Parent-only card picker (plan decision 5 — card style, not the tab-based
 * grades ChildSwitcher). Real `<button>` cards: keyboard-focusable, visible
 * focus ring, ≥44px touch target, `aria-pressed` for selected state.
 */
export function ChildPicker({
  childList,
  selectedChildId,
  onSelect,
  disabled,
}: ChildPickerProps) {
  const t = useTranslations("timetableView");
  return (
    <fieldset className="flex flex-wrap gap-3 border-0 p-0">
      <legend className="sr-only">{t("childPickerLabel")}</legend>
      {childList.map((child) => {
        const active = child.childId === selectedChildId;
        const c = CHILD_COLOR_CLASSES[child.color];
        return (
          <button
            key={child.childId}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onSelect(child.childId)}
            className={cn(
              "flex min-h-11 min-w-[240px] items-center gap-2.5 rounded-lg border-2 px-4 py-3 text-left",
              "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              "motion-safe:transition-colors disabled:pointer-events-none disabled:opacity-60",
              active
                ? cn(c.border, c.tint)
                : "border-edu-border bg-edu-card hover:border-edu-text-muted",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-9 items-center justify-center rounded-full font-bold text-sm text-white",
                c.avatarBg,
              )}
            >
              {child.avatar}
            </span>
            <span className="whitespace-nowrap">
              <span className="block font-bold text-edu-text-primary text-sm">
                {child.name}
              </span>
              <span className="block text-[11px] text-edu-text-secondary">
                {t("classLabel", { className: child.className })}
              </span>
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
