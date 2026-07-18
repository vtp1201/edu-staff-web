"use client";

import { useTranslations } from "next-intl";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/shared/utils";
import type { AttendanceStatus } from "../../domain/entities/attendance-status.entity";

const STATUSES: AttendanceStatus[] = [
  "present",
  "late",
  "excusedAbsent",
  "absent",
];

/** `late` reuses the tinted `bg-edu-info/15` + `text-edu-text-primary`
 *  treatment already established by `status-badge.tsx`'s `TONE_CLASS.info`
 *  (A11Y-101: solid `bg-edu-info` + `text-edu-text-primary` measures 4.42:1,
 *  just under the 4.5:1 AA threshold for this 12px/non-bold label; the tint
 *  variant measures ~11.5:1). A `border-edu-info` keeps the selected state
 *  visually distinct from the unselected bordered state. No new `tokens.css`
 *  entry (ADR `0058`). */
const VARIANT_CLASS: Record<AttendanceStatus, string> = {
  present:
    "data-[state=on]:bg-edu-success data-[state=on]:text-edu-success-foreground",
  late: "data-[state=on]:bg-edu-info/15 data-[state=on]:text-edu-text-primary data-[state=on]:border-edu-info",
  excusedAbsent:
    "data-[state=on]:bg-edu-warning data-[state=on]:text-edu-warning-foreground",
  absent:
    "data-[state=on]:bg-edu-error data-[state=on]:text-edu-error-foreground",
};

type Props = {
  value: AttendanceStatus;
  onChange: (next: AttendanceStatus) => void;
  size?: "sm" | "md";
};

export function AttendanceStatusToggle({
  value,
  onChange,
  size = "sm",
}: Props) {
  const t = useTranslations("attendance.status");

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as AttendanceStatus);
      }}
      className="gap-1"
    >
      {STATUSES.map((s) => (
        <ToggleGroupItem
          key={s}
          value={s}
          aria-label={t(s)}
          className={cn(
            "border border-border",
            size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm",
            VARIANT_CLASS[s],
          )}
        >
          {t(s)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
