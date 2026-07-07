"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditEvent } from "../../../domain/entities/audit-event.entity";
import { LogRow } from "./log-row";

export interface LogTableProps {
  events: AuditEvent[];
}

/**
 * AC-2 / AC-12 — audit event list. Accessible name via a visible <h2> heading
 * before the <Table> (mirrors audit-trail-table.tsx); TableHead defaults to
 * scope="col". Pure list renderer — no loading/empty/error branching here.
 */
export function LogTable({ events }: LogTableProps) {
  const t = useTranslations("auditLog");
  const tc = useTranslations("auditLog.columns");

  return (
    <section className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <h2 className="sr-only">{t("tableLabel")}</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tc("occurredAt")}</TableHead>
              <TableHead>{tc("actor")}</TableHead>
              <TableHead>{tc("action")}</TableHead>
              <TableHead>{tc("entityType")}</TableHead>
              <TableHead>{tc("entity")}</TableHead>
              <TableHead>{tc("before")}</TableHead>
              <TableHead>{tc("after")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <LogRow key={event.id} event={event} />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
