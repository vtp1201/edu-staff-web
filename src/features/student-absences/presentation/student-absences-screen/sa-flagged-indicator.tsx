"use client";

import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";

/**
 * Signal 2 of 2 — the principal-set terminal flag (FR-007/AC-007.2).
 *
 * Takes NO props on purpose: callers decide whether to MOUNT it at all via
 * `absence.state === "FLAGGED_UNEXCUSED"`. There is no `visible`/`suppressed`
 * prop, so for a `RECORDED` row the indicator is GENUINELY absent from the DOM —
 * not an empty placeholder and not something a future flag could hide
 * (mirrors `SDSelfApprovedNote`'s "no suppression prop" contract).
 *
 * Visually AND semantically distinct from `SAExcusedBadge` (error tone + flag
 * icon vs success/warning tone + check/alert icon) — the two are never merged
 * into one pill (FR-007), and both pair icon + text (NFR-001).
 */
export type SAFlaggedIndicatorProps = Record<string, never>;

export function SAFlaggedIndicator() {
  const t = useTranslations("studentAbsences");
  return (
    <StatusBadge tone="error">
      <Flag className="size-3" aria-hidden="true" />
      {t("flagged")}
    </StatusBadge>
  );
}
