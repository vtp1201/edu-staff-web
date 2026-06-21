"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/utils";
import type { ViolationEntity } from "../../../domain/entities/violation.entity";
import {
  HIGH_SEVERITY_BADGE_CLASS,
  SEVERITY_BAR_CLASS,
  SEVERITY_TONE,
} from "../../discipline-screen/discipline-tones";

/**
 * Read-only violation list for the parent view (US-E09.4, UC-07). NEVER renders
 * add / edit / delete affordances — parents only view.
 */
export function ViolationsList({
  violations,
}: {
  violations: ViolationEntity[];
}) {
  const t = useTranslations("discipline.studentConduct.myViolations");
  const tType = useTranslations("discipline.violations.types");
  const tSeverity = useTranslations("discipline.violations.severity");

  return (
    <section className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <div className="border-border border-b px-5 py-3.5">
        <h2 className="font-bold text-foreground text-sm">{t("title")}</h2>
      </div>

      {violations.length === 0 ? (
        <div className="px-6 py-12 text-center">
          {/* A11Y-E09.4-005: text-edu-success (#13DEB9) on white = 1.72:1 — FAIL SC 1.4.11.
              text-edu-success-text (#007A6E) on white = 5.24:1 — PASS. */}
          <ShieldCheck
            className="mx-auto size-9 text-edu-success-text"
            aria-hidden="true"
          />
          <p className="mt-2.5 font-semibold text-edu-success-text text-sm">
            {t("empty")}
          </p>
        </div>
      ) : (
        <ul>
          {violations.map((v) => (
            <li
              key={v.id}
              className="flex items-start gap-4 border-border border-b px-5 py-4 last:border-b-0"
            >
              <span
                className={cn(
                  "w-1 shrink-0 self-stretch rounded-sm",
                  SEVERITY_BAR_CLASS[v.severity],
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-foreground text-sm">
                    {tType(v.type)}
                  </span>
                  {v.severity === "high" ? (
                    <Badge
                      className={cn("border-0", HIGH_SEVERITY_BADGE_CLASS)}
                    >
                      {tSeverity("high")}
                    </Badge>
                  ) : (
                    <StatusBadge tone={SEVERITY_TONE[v.severity]}>
                      {tSeverity(v.severity)}
                    </StatusBadge>
                  )}
                </div>
                <p className="mb-1 text-foreground text-sm">{v.description}</p>
                <span className="text-edu-text-secondary text-xs">
                  {v.date}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
