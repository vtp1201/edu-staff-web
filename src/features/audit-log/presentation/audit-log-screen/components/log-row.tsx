"use client";

import { useFormatter, useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { TableCell, TableRow } from "@/components/ui/table";
import type { AuditEvent } from "../../../domain/entities/audit-event.entity";
import { auditBadgeTone } from "./audit-badge-tone";
import { formatAuditValue } from "./format-audit-value";

export interface LogRowProps {
  event: AuditEvent;
}

/**
 * AC-2 / AC-8 — one audit event row. No edit/delete affordance anywhere
 * (append-only). Badge tone via auditBadgeTone; before/after via
 * formatAuditValue.
 */
export function LogRow({ event }: LogRowProps) {
  const tEntity = useTranslations("auditLog.entityType");
  const tAction = useTranslations("auditLog.action");
  const format = useFormatter();

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-muted-foreground text-sm tabular-nums">
        {format.dateTime(new Date(event.occurredAt), {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </TableCell>
      <TableCell>
        <div className="font-semibold text-foreground text-sm">
          {event.actorName}
        </div>
        <div className="text-muted-foreground text-xs uppercase tracking-wide">
          {event.actorRole}
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge tone={auditBadgeTone(event.entityType, event.action)}>
          {tAction(event.action)}
        </StatusBadge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {tEntity(event.entityType)}
      </TableCell>
      <TableCell>
        <div className="font-medium text-foreground text-sm">
          {event.entityLabel}
        </div>
        <div className="font-mono text-muted-foreground text-xs">
          {event.entityId}
        </div>
      </TableCell>
      <TableCell className="font-mono text-muted-foreground text-sm">
        {formatAuditValue(event.beforeValue)}
      </TableCell>
      <TableCell className="font-mono font-semibold text-foreground text-sm">
        {formatAuditValue(event.afterValue)}
      </TableCell>
    </TableRow>
  );
}
