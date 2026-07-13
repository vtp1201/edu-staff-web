"use client";

import { useTranslations } from "next-intl";
import type { DuplicateReportRef } from "../../../domain/entities/report-detail.entity";
import { formatReportTimestamp } from "./format-report-row";

/**
 * Duplicate-report list (UC-1930). Shows a header count + reporter/date list
 * when there are other reports on the same content; a plain "0" line otherwise
 * (no empty-list placeholder taking excess space, AC-1930.2).
 */
export function DuplicateReportList({
  duplicates,
}: {
  duplicates: DuplicateReportRef[];
}) {
  const t = useTranslations("moderation.duplicates");

  if (duplicates.length === 0) {
    return <p className="text-muted-foreground text-xs">{t("none")}</p>;
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-bold text-foreground text-sm">
        {t("heading", { count: duplicates.length })}
      </h3>
      <ul className="flex flex-col gap-1">
        {duplicates.map((d) => (
          <li
            key={d.reportId}
            className="flex items-center justify-between rounded-[var(--edu-radius-btn)] bg-muted/50 px-3 py-1.5 text-sm"
          >
            <span className="text-foreground">{d.reporterName}</span>
            <span className="text-muted-foreground text-xs">
              {formatReportTimestamp(d.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
