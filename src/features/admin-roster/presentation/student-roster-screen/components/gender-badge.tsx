"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";

interface GenderBadgeProps {
  gender: "F" | "M" | "O";
}

const TONE: Record<GenderBadgeProps["gender"], string> = {
  F: "bg-edu-gender-female-light text-edu-gender-female-text",
  M: "bg-edu-gender-male-light text-edu-gender-male-text",
  // "Khác" (IAM `OTHER`) has no dedicated token, and minting one requires an
  // ADR — the neutral semantic pair is the deliberate choice. The letter plus
  // the aria-label carry the meaning; colour never does.
  O: "bg-muted text-edu-text-secondary",
};

/** Circular 22×22 gender indicator. Token classes per decision 0028.
 *  Conveys gender by text initial + aria-label, not color alone (a11y).
 *  A student with NO recorded gender renders `AbsentValue` instead — this
 *  component is never asked to represent absence. */
export function GenderBadge({ gender }: GenderBadgeProps) {
  const t = useTranslations("adminRoster");
  const label =
    gender === "F"
      ? t("table.genderFemale")
      : gender === "M"
        ? t("table.genderMale")
        : t("table.genderOther");
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "inline-flex size-[22px] items-center justify-center rounded-full font-extrabold text-[10.5px]",
        TONE[gender],
      )}
    >
      {gender}
    </span>
  );
}
