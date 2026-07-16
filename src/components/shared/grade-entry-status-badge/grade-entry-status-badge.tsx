import { CheckCircle2, Circle, Clock, Lock } from "lucide-react";
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
 * Row-summary variant (component-design.md §2) — derived, never stored. Every
 * row collapses to exactly one of `RowGradeStatus`'s 5 literals via
 * `deriveRowStatus`'s deliberate worst-progress-wins precedence
 * (state-architecture.md §1.3) — there is no separate "mixed" state to render:
 * a row with 2 DRAFT + 3 LOCKED cells IS the `draft` status (draft outranks
 * everything), not a distinct 6th visual case. A11Y-103 (design review):
 * an earlier draft of this component carried a dead `mixed` branch (using
 * `aria-label` instead of `aria-describedby`, unreachable given
 * `deriveRowStatus`'s return type) — removed rather than implemented, since
 * inventing a real "mixed" state would mean deliberately UNDOING the
 * worst-progress-wins precedence this exact component/rule was designed
 * around. If a future screen genuinely needs a per-row breakdown (e.g. "2
 * nháp · 3 đã khóa") independent of the single worst-status summary, that is
 * a new, explicitly-scoped design decision — not a fallback branch here.
 */
export interface GradeRowStatusSummaryBadgeProps {
  rowStatus: RowGradeStatus;
  className?: string;
}

const ROW_STATUS_TO_ENTRY_STATUS: Record<
  Exclude<RowGradeStatus, "empty">,
  GradeEntryStatus
> = {
  draft: "DRAFT",
  "pending-approval": "PENDING_APPROVAL",
  published: "PUBLISHED",
  locked: "LOCKED",
};

export function GradeRowStatusSummaryBadge({
  rowStatus,
  className,
}: GradeRowStatusSummaryBadgeProps) {
  if (rowStatus === "empty") {
    return null;
  }
  return (
    <GradeEntryStatusBadge
      status={ROW_STATUS_TO_ENTRY_STATUS[rowStatus]}
      className={className}
    />
  );
}
