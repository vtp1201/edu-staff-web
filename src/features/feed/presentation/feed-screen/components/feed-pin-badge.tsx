import { Pin } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";

export interface FeedPinBadgeProps {
  /** "Đã ghim". */
  label: string;
  /** AC-1909.3 "not yet persisted" caption — always shown while pinned. */
  notPersistedLabel: string;
}

/**
 * Pinned marker (FR-008/AC-1907.3) — icon + text, never colour-only. The
 * non-blocking "not yet persisted" caption (AC-1909.3) rides alongside it while
 * a post is pinned (all pins are mock in this story).
 */
export function FeedPinBadge({ label, notPersistedLabel }: FeedPinBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusBadge tone="primary" className="gap-1">
        <Pin aria-hidden="true" className="size-2.5" />
        {label}
      </StatusBadge>
      <span className="text-[11px] text-edu-text-secondary">
        {notPersistedLabel}
      </span>
    </span>
  );
}
