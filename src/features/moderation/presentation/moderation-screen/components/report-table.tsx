"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { AbsentValue } from "@/components/shared/absent-value";
import { StatusBadge } from "@/components/shared/status-badge/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type ReportEntity,
  type ReportRef,
  reportRefOf,
} from "../../../domain/entities/report.entity";
import { formatReportRow } from "./format-report-row";
import { ReportStatusBadge } from "./report-status-badge";

export interface ReportTableProps {
  reports: ReportEntity[];
  /**
   * Receives the whole addressing tuple, not an id: the detail point-read needs
   * the row's echoed `filedAt` + status partition (US-E18.32). Threading the
   * ref from the row is what makes a bookmarkable detail URL impossible.
   */
  onOpen: (ref: ReportRef) => void;
}

/** Desktop table (hidden md:block — the ≤760px switch shows ReportCard). */
export function ReportTable({ reports, onOpen }: ReportTableProps) {
  const t = useTranslations("moderation.table");
  const tReason = useTranslations("moderation.reportDialog.reasons");
  const tKind = useTranslations("moderation.kinds");
  const tRoot = useTranslations("moderation");

  return (
    <div className="hidden overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("content")}</TableHead>
            <TableHead>{t("reason")}</TableHead>
            <TableHead>{t("reporter")}</TableHead>
            <TableHead>{t("status")}</TableHead>
            <TableHead>{t("createdAt")}</TableHead>
            <TableHead className="sr-only">{t("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => {
            const row = formatReportRow(report);
            return (
              <TableRow key={row.id}>
                <TableCell className="max-w-xs">
                  {/* The wire returns no content preview (US-E18.32) — fall
                      back to the only identifier it DOES return, the target
                      id, rather than an empty or invented line. */}
                  <span className="line-clamp-2 font-medium text-foreground text-sm">
                    {row.contentPreview ?? row.contentId}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {tKind(row.kind)}
                    {row.authorName ? ` · ${row.authorName}` : ""}
                    {row.duplicateCount !== null &&
                      row.duplicateCount > 0 &&
                      ` · ${t("duplicateSuffix", { count: row.duplicateCount })}`}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge tone="muted">{tReason(row.reason)}</StatusBadge>
                </TableCell>
                <TableCell className="text-sm">
                  {row.reporterName ?? (
                    <AbsentValue label={tRoot("unavailable")} />
                  )}
                </TableCell>
                <TableCell>
                  <ReportStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                  {row.createdAtLabel}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("openDetail", { id: row.id })}
                    onClick={() => onOpen(reportRefOf(report))}
                  >
                    <ChevronRight aria-hidden="true" className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
