"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * `selfApproved` audit-transparency annotation (ADR 0073, FR-010, NFR-008 pt.5).
 *
 * **ZERO PROPS BY DESIGN.** There is no boolean, no `hidden`, no `variant` and no
 * internal condition of any kind: once a caller mounts this component it ALWAYS
 * renders its full label. Callers may only decide whether to mount it, via the
 * single expression `record.selfApproved` (itself derived once at the mapper
 * boundary as `approverMemberId === authorMemberId`). This shape is the
 * grep-able structural proof for the Phase-8 audit item "no conditional wraps
 * its render call beyond the equality check itself" — suppressing the annotation
 * is a defect, so the component makes suppression unrepresentable.
 */
export type SDSelfApprovedNoteProps = Record<string, never>;

export function SDSelfApprovedNote() {
  const t = useTranslations("staffDiscipline.conductNotes");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--edu-radius-btn)] border border-border border-dashed bg-muted px-2 py-0.5 font-bold text-[11px] text-edu-text-secondary">
      <ShieldAlert className="size-3" aria-hidden="true" />
      {t("selfApprovedNote")}
    </span>
  );
}
