import { StatusBadge } from "@/components/shared/status-badge";
import type { ConductGrade } from "../../../domain/entities/conduct-summary.entity";
import { CONDUCT_GRADE_TONE } from "../discipline-tones";

export function ConductBadge({
  grade,
  label,
}: {
  grade: ConductGrade;
  label: string;
}) {
  return <StatusBadge tone={CONDUCT_GRADE_TONE[grade]}>{label}</StatusBadge>;
}
