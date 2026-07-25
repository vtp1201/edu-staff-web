import { AlertTriangle, Clock, Link2, X } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  LinkAuditAction,
  LinkAuditEntry,
} from "../../domain/entities/link-audit-entry.entity";

export interface PLAuditTrailSectionProps {
  status: "loading" | "error" | "success";
  entries?: LinkAuditEntry[];
  /** Already-translated + already-formatted timestamp per entryId. */
  formatTimestamp: (occurredAt: string) => string;
  onRetry: () => void;
  labels: {
    sectionTitle: string;
    loadingLabel: string;
    emptyTitle: string;
    emptyBody: string;
    errorMessage: string;
    retryLabel: string;
    notePrefix: string;
    actionLabel: Record<LinkAuditAction, string>;
  };
}

/** action → tone/icon (design-spec `auditTrailSection.actionBadgeMapping`).
 *  Tones resolve through the canonical shared StatusBadge, so the badge carries
 *  BOTH an icon and its text label — never colour alone (NFR-101). */
const ACTION_TONE: Record<LinkAuditAction, StatusTone> = {
  created: "teal",
  unlinked: "error-dark",
};

const ACTION_ICON = {
  created: Link2,
  unlinked: X,
} as const;

function PLAuditEntryRow({
  entry,
  formatTimestamp,
  labels,
}: {
  entry: LinkAuditEntry;
  formatTimestamp: PLAuditTrailSectionProps["formatTimestamp"];
  labels: PLAuditTrailSectionProps["labels"];
}) {
  const Icon = ACTION_ICON[entry.action];
  return (
    <li className="flex flex-col gap-1 rounded-lg border border-border px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={ACTION_TONE[entry.action]} className="gap-1">
          <Icon className="size-3" aria-hidden="true" />
          {labels.actionLabel[entry.action]}
        </StatusBadge>
        <span className="font-semibold text-foreground text-sm">
          {entry.actorName}
        </span>
        <span className="ml-auto whitespace-nowrap text-muted-foreground text-xs">
          {formatTimestamp(entry.occurredAt)}
        </span>
      </div>
      {entry.note && (
        <p className="pl-0.5 text-muted-foreground text-xs">
          {labels.notePrefix}: {entry.note}
        </p>
      )}
    </li>
  );
}

/**
 * Audit-trail sub-section of the detail dialog (US-E20.3, FR-101). Owns its OWN
 * loading/empty/error/success state scoped to this region only — a trail-fetch
 * failure NEVER blocks the rest of the already-rendered dialog (AC-101.1/.3).
 *
 * Append-only and read-only by design (FR-109): there is deliberately no edit,
 * delete, filter, search or date-range control here. The list is rendered in the
 * order received — the repository guarantees reverse-chronological order by
 * construction (NFR-102), so there is no client-side sort to get wrong.
 */
export function PLAuditTrailSection({
  status,
  entries,
  formatTimestamp,
  onRetry,
  labels,
}: PLAuditTrailSectionProps) {
  return (
    <section className="mt-1.5 border-border border-t pt-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <p className="font-bold text-edu-text-secondary text-xs uppercase tracking-wide">
          {labels.sectionTitle}
        </p>
      </div>

      {status === "loading" && (
        <div aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only">{labels.loadingLabel}</span>
          {[0, 1].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2"
            >
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="ml-auto h-3 w-20" />
            </div>
          ))}
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="flex flex-col items-start gap-2 rounded-lg bg-edu-error/10 px-3 py-2.5"
        >
          <p className="flex items-start gap-1.5 text-edu-error-text text-sm">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            {labels.errorMessage}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            {labels.retryLabel}
          </Button>
        </div>
      )}

      {status === "success" &&
        (entries && entries.length > 0 ? (
          <ol className="flex list-none flex-col gap-2 p-0">
            {entries.map((entry) => (
              <PLAuditEntryRow
                key={entry.entryId}
                entry={entry}
                formatTimestamp={formatTimestamp}
                labels={labels}
              />
            ))}
          </ol>
        ) : (
          // Empty is the dominant, honest default (FR-104) — informational, NOT
          // an error tone, and with no CTA (nothing for the admin to do).
          <div className="flex gap-2.5 py-0.5">
            <span className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Clock
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground text-sm">
                {labels.emptyTitle}
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                {labels.emptyBody}
              </p>
            </div>
          </div>
        ))}
    </section>
  );
}
