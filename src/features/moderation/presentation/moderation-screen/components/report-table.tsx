"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
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
import type { ReportEntity } from "../../../domain/entities/report.entity";
import { formatReportRow } from "./format-report-row";
import { ReportStatusBadge } from "./report-status-badge";

export interface ReportTableProps {
  reports: ReportEntity[];
  onOpen: (reportId: string) => void;
}

/** Desktop table (hidden md:block — the ≤760px switch shows ReportCard). */
export function ReportTable({ reports, onOpen }: ReportTableProps) {
  const t = useTranslations("moderation.table");
  const tReason = useTranslations("moderation.reportDialog.reasons");
  const tKind = useTranslations("moderation.kinds");

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
            <TableHead className="sr-only">{t("content")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => {
            const row = formatReportRow(report);
            return (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => onOpen(row.id)}
              >
                <TableCell className="max-w-xs">
                  <span className="line-clamp-2 font-medium text-foreground text-sm">
                    {row.contentPreview}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {tKind(row.kind)} · {row.authorName}
                    {row.duplicateCount > 0 &&
                      ` · ${t("duplicateSuffix", { count: row.duplicateCount })}`}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge tone="muted">{tReason(row.reason)}</StatusBadge>
                </TableCell>
                <TableCell className="text-sm">{row.reporterName}</TableCell>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(row.id);
                    }}
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
