"use client";

import { Download, FileText } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReportListItemEntity } from "@/features/principal/domain/reports/entities/report-list-item.entity";

export interface PeriodicReportsTableProps {
  reports: ReportListItemEntity[];
  /** Download mechanism is out of this spec's scope (FR-006 only gates the
   *  disabled attribute) — optional, no-op default. */
  onDownload?: (report: ReportListItemEntity) => void;
}

/** Pure list renderer (success state only). Status = icon+text badge, never
 *  color alone; download gated by the `disabled` ATTRIBUTE (FR-006/NFR-001). */
export function PeriodicReportsTable({
  reports,
  onDownload,
}: PeriodicReportsTableProps) {
  const t = useTranslations("reports.table");
  const format = useFormatter();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{t("columns.name")}</TableHead>
          <TableHead scope="col">{t("columns.term")}</TableHead>
          <TableHead scope="col">{t("columns.createdAt")}</TableHead>
          <TableHead scope="col" className="text-center">
            {t("columns.status")}
          </TableHead>
          <TableHead scope="col" className="text-center">
            {t("columns.download")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((r) => {
          const ready = r.status === "ready";
          return (
            <TableRow key={r.id}>
              <TableCell className="font-semibold text-foreground">
                <span className="inline-flex items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-[var(--edu-radius-btn)] bg-primary/12">
                    <FileText className="size-3.5 text-primary" aria-hidden />
                  </span>
                  {r.name}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {t(`termLabels.${r.term}`)}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {format.dateTime(new Date(r.createdAt), {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell className="text-center">
                <StatusBadge tone={ready ? "success" : "warning"}>
                  {t(`status.${r.status}`)}
                </StatusBadge>
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="border border-border"
                  disabled={!ready}
                  aria-label={t("downloadAria", { name: r.name })}
                  onClick={() => onDownload?.(r)}
                >
                  <Download className="size-4" aria-hidden="true" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
