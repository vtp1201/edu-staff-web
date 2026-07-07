"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Static GDPR / Nghị định 13/2023 compliance banner (US-E12.12, AC-8).
 * Read-only affordance signal — no interactive elements.
 */
export function ComplianceNotice() {
  const t = useTranslations("auditLog.compliance");

  return (
    <div className="flex items-center gap-3 rounded-[var(--edu-radius-btn)] border border-border bg-muted px-4 py-3">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-edu-error/15"
        aria-hidden="true"
      >
        <Lock className="size-3.5 text-edu-error-text" />
      </span>
      <p className="text-edu-text-secondary text-sm leading-relaxed">
        <strong className="font-extrabold text-foreground">
          {t("strong")}
        </strong>{" "}
        {t.rich("body", {
          decree: (chunks) => (
            <span className="rounded bg-card px-1.5 py-0.5 font-bold font-mono text-foreground text-xs">
              {chunks}
            </span>
          ),
        })}
      </p>
    </div>
  );
}
