import type {
  ViolationSeverity,
  ViolationStatus,
  ViolationType,
} from "../../domain/entities/violation.entity";

/** Mirrors core service `ViolationResponse` (camelCase wire fields). */
export interface ViolationResponseDto {
  id: string;
  studentId: string;
  studentName: string;
  initials?: string;
  avatarTone?: string;
  classId: string;
  className: string;
  type: ViolationType;
  date: string;
  period?: number | null;
  description: string;
  severity: ViolationSeverity;
  handledBy: string;
  status: ViolationStatus;
}
