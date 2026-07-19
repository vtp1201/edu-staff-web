import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type { RelationshipType } from "../../domain/entities/parent-student-link.entity";

/** relationship → tone (design-spec `parentLinks.table.relationBadges`). */
const RELATION_TONE: Record<RelationshipType, StatusTone> = {
  father: "info",
  mother: "purple",
  guardian: "muted",
};

export interface PLRelationBadgeProps {
  relationship: RelationshipType;
  /** Already-translated relationship label. */
  label: string;
}

/** Thin wrapper over the shared StatusBadge — label conveys meaning (not color
 * alone, NFR-001); relationship needs no icon per design-spec. */
export function PLRelationBadge({ relationship, label }: PLRelationBadgeProps) {
  return <StatusBadge tone={RELATION_TONE[relationship]}>{label}</StatusBadge>;
}
