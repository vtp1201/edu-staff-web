"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";
import type { SubjectParent } from "../../domain/entities/subject-parent.entity";

/** Concept tone — uses AA-compliant text tokens on tinted backgrounds (US-E12.3). */
const CONCEPT_TONE: Record<"BO_MON" | "TO" | "KHOA", string> = {
  BO_MON: "bg-primary/12 text-foreground",
  TO: "bg-edu-teal/15 text-edu-teal-text",
  KHOA: "bg-edu-purple/15 text-edu-purple-text",
};

export function conceptLabel(
  parent: Pick<SubjectParent, "conceptType" | "conceptLabelCustom">,
  t: (key: string) => string,
): string {
  if (parent.conceptLabelCustom) return parent.conceptLabelCustom;
  switch (parent.conceptType) {
    case "BO_MON":
      return t("conceptBomon");
    case "TO":
      return t("conceptTo");
    case "KHOA":
      return t("conceptKhoa");
    default:
      return t("conceptBomon");
  }
}

export function ConceptBadge({
  parent,
  className,
}: {
  parent: Pick<SubjectParent, "conceptType" | "conceptLabelCustom">;
  className?: string;
}) {
  const t = useTranslations("subjectCatalogue.createParentDialog");
  const tone = parent.conceptLabelCustom
    ? CONCEPT_TONE.BO_MON
    : CONCEPT_TONE[parent.conceptType ?? "BO_MON"];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone,
        className,
      )}
    >
      {conceptLabel(parent, t as (key: string) => string)}
    </span>
  );
}
