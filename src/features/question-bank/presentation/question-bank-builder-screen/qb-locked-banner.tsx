"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

/** Read-only notice on a PUBLISHED question (FR-011). role="status", icon+text. */
export function QBLockedBanner({
  publishedAtDisplay,
}: {
  publishedAtDisplay?: string;
}) {
  const t = useTranslations("questionBank.lockedNotice");
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 border-border border-b bg-edu-success/12 px-6 py-2.5"
    >
      <Lock
        className="mt-0.5 size-4 shrink-0 text-edu-success-text"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="font-bold text-foreground text-sm">{t("title")}</p>
        <p className="text-edu-text-secondary text-sm">
          {t("body")}
          {publishedAtDisplay ? ` · ${publishedAtDisplay}` : ""}
        </p>
      </div>
    </div>
  );
}
