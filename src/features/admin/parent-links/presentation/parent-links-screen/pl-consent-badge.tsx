import { Check, Clock, type LucideIcon, X } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type { ConsentStatus } from "../../domain/entities/parent-student-link.entity";

/** consentStatus → tone (design-spec `parentLinks.table.consentBadges`). */
const CONSENT_TONE: Record<ConsentStatus, StatusTone> = {
  agreed: "teal",
  pending: "warning",
  declined: "error-dark",
};

const CONSENT_ICON: Record<ConsentStatus, LucideIcon> = {
  agreed: Check,
  pending: Clock,
  declined: X,
};

export interface PLConsentBadgeProps {
  status: ConsentStatus;
  /** Already-translated consent label. */
  label: string;
}

/** Thin wrapper over the shared StatusBadge — icon + text, never color-only
 * (NFR-001). Icon is decorative (aria-hidden); the label carries the meaning. */
export function PLConsentBadge({ status, label }: PLConsentBadgeProps) {
  const Icon = CONSENT_ICON[status];
  return (
    <StatusBadge tone={CONSENT_TONE[status]} className="gap-1">
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </StatusBadge>
  );
}
