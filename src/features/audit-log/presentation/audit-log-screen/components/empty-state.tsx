"use client";

import { ScrollText } from "lucide-react";
import { useTranslations } from "next-intl";

/** AC-9 — no events match the current filter. */
export function EmptyState() {
  const t = useTranslations("auditLog.empty");

  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--edu-radius-card)] border border-border border-dashed bg-card p-12 text-center">
      <ScrollText className="size-9 text-border" aria-hidden="true" />
      <p className="font-bold text-edu-text-secondary text-sm">{t("title")}</p>
      <p className="text-muted-foreground text-xs">{t("hint")}</p>
    </div>
  );
}
