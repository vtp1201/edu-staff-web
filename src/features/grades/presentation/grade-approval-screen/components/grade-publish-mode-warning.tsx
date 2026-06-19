"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

export function GradePublishModeWarning() {
  const t = useTranslations("gradeApproval");
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-[var(--edu-radius-card)] border border-edu-info/30 bg-edu-info/10 p-4 text-sm text-foreground"
    >
      <Info
        className="mt-0.5 size-5 shrink-0 text-foreground"
        aria-hidden="true"
      />
      <p>{t("selfPublishModeWarning")}</p>
    </div>
  );
}
