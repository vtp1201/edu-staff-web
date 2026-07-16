import { CheckCircle2, Circle, Clock, Layers, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/shared/status-badge/status-badge";
import type { RowGradeStatus } from "@/features/grades/domain/entities/derive-row-status";
import type { GradeEntryStatus } from "@/features/grades/domain/entities/grade-entry-status.entity";
import { cn } from "@/shared/utils";

/**
 * Per-cell / row-summary grade workflow badge (US-E18.12, ADR 0054). Matches
 * the established `BatchStatusBadge` tone/icon convention for
 * `PENDING_APPROVAL`/`PUBLISHED`/`LOCKED`; `DRAFT` uses `info` tone (lead
 * decision, component-design.md — clearer separation from `LOCKED`'s
 * `muted` on a dense grid, both AA-safe per `StatusBadge`'s tone table).
 * Never color-only — icon + label always present (accessibility.md).
 */
const TONE: Record<GradeEntryStatus, StatusTone> = {
  DRAFT: "info",
  SUBMITTED: "warning", // dead on the wire — aliased to PENDING_APPROVAL's look
  PENDING_APPROVAL: "warning",
  PUBLISHED: "success",
  LOCKED: "muted",
};

const ICON: Record<GradeEntryStatus, typeof Circle> = {
  DRAFT: Circle,
  SUBMITTED: Clock,
  PENDING_APPROVAL: Clock,
  PUBLISHED: CheckCircle2,
  LOCKED: Lock,
};

const LABEL_KEY: Record<GradeEntryStatus, string> = {
  DRAFT: "draft",
  SUBMITTED: "pendingApproval",
  PENDING_APPROVAL: "pendingApproval",
  PUBLISHED: "published",
  LOCKED: "locked",
};

export interface GradeEntryStatusBadgeProps {
  status: GradeEntryStatus;
  className?: string;
}

export function GradeEntryStatusBadge({
  status,
  className,
}: GradeEntryStatusBadgeProps) {
  const t = useTranslations("gradeCellStatus");
  const Icon = ICON[status];
  return (
    <StatusBadge tone={TONE[status]} className={cn("gap-1", className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {t(
        LABEL_KEY[status] as
          | "draft"
          | "pendingApproval"
          | "published"
          | "locked",
      )}
    </StatusBadge>
  );
}

/**
 * Row-summary variant (component-design.md §2) — derived, never stored. A
 * single clean state reuses the per-cell badge; `mixed` gets a distinct
 * compound affordance (never a 5th color) with a counted breakdown for
 * assistive tech.
 */
export interface GradeRowStatusSummaryBadgeProps {
  rowStatus: RowGradeStatus;
  /** e.g. "2 nháp · 1 chờ duyệt · 3 đã khóa" — only used when rowStatus spans ≥2 statuses */
  breakdown?: string;
  className?: string;
}

const ROW_STATUS_TO_ENTRY_STATUS: Partial<
  Record<RowGradeStatus, GradeEntryStatus>
> = {
  draft: "DRAFT",
  "pending-approval": "PENDING_APPROVAL",
  published: "PUBLISHED",
  locked: "LOCKED",
};

export function GradeRowStatusSummaryBadge({
  rowStatus,
  breakdown,
  className,
}: GradeRowStatusSummaryBadgeProps) {
  const t = useTranslations("gradeCellStatus");

  if (rowStatus === "empty") {
    return null;
  }

  const entryStatus = ROW_STATUS_TO_ENTRY_STATUS[rowStatus];
  if (entryStatus) {
    return <GradeEntryStatusBadge status={entryStatus} className={className} />;
  }

  // "mixed" is impossible per deriveRowStatus's current return type, but kept
  // for forward-compat with a caller that pre-aggregates multiple rows.
  return (
    <StatusBadge
      tone="info"
      className={cn("gap-1", className)}
      aria-label={breakdown}
    >
      <Layers className="size-3.5" aria-hidden="true" />
      {t("mixed")}
    </StatusBadge>
  );
}
