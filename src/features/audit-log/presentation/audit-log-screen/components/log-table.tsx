"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
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
 * AC-2 / AC-12 — audit event list. Accessible name via a sr-only <h2> heading
 * (mirrors audit-trail-table.tsx) that is ALSO programmatically linked to the
 * <table> via aria-labelledby so the table itself carries the name (AC-12
 * "caption + scope"); TableHead defaults to scope="col". Pure list renderer —
 * no loading/empty/error branching here.
 */
export function LogTable({ events }: LogTableProps) {
  const t = useTranslations("auditLog");
  const tc = useTranslations("auditLog.columns");
  const headingId = useId();

  return (
    <section className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <h2 id={headingId} className="sr-only">
        {t("tableLabel")}
      </h2>
      <div className="overflow-x-auto">
        <Table aria-labelledby={headingId}>
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
