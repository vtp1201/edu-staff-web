"use client";

import { useFormatter, useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SealAuditEntry } from "../../../domain/entities/seal-batch.entity";

export interface AuditTrailTableProps {
  entries: SealAuditEntry[];
  isLoading: boolean;
}

/** AC-6 — seal/unseal audit trail. */
export function AuditTrailTable({ entries, isLoading }: AuditTrailTableProps) {
  const t = useTranslations("academicRecordSeal.auditTrail");
  const term = useTranslations("academicRecordSeal.selector");
  const format = useFormatter();

  return (
    <section className="rounded-xl border border-border bg-card shadow-card">
      <h2 className="border-border border-b px-5 py-4 font-bold text-base text-foreground">
        {t("title")}
      </h2>
      {isLoading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : entries.length === 0 ? (
        <p className="p-8 text-center text-muted-foreground text-sm">
          {t("empty")}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.class")}</TableHead>
              <TableHead>{t("columns.term")}</TableHead>
              <TableHead>{t("columns.year")}</TableHead>
              <TableHead>{t("columns.actor")}</TableHead>
              <TableHead>{t("columns.action")}</TableHead>
              <TableHead>{t("columns.occurredAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.classId}</TableCell>
                <TableCell>
                  {term(e.term === "HK1" ? "term1" : "term2")}
                </TableCell>
                <TableCell>{e.year}</TableCell>
                <TableCell>{e.actorName}</TableCell>
                <TableCell>
                  <StatusBadge
                    tone={e.action === "SEAL" ? "success" : "warning"}
                  >
                    {e.action === "SEAL" ? t("actionSeal") : t("actionUnseal")}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm tabular-nums">
                  {format.dateTime(new Date(e.occurredAt), {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
