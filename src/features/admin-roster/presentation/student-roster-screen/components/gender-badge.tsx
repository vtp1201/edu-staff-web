"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";

interface GenderBadgeProps {
  gender: "F" | "M";
}

/** Circular 22×22 gender indicator. Token classes per decision 0028.
 *  Conveys gender by text initial + aria-label, not color alone (a11y). */
export function GenderBadge({ gender }: GenderBadgeProps) {
  const t = useTranslations("adminRoster");
  const label =
    gender === "F" ? t("table.genderFemale") : t("table.genderMale");
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "inline-flex size-[22px] items-center justify-center rounded-full font-extrabold text-[10.5px]",
        gender === "F"
          ? "bg-edu-gender-female-light text-edu-gender-female-text"
          : "bg-edu-gender-male-light text-edu-gender-male-text",
      )}
    >
      {gender}
    </span>
  );
}
