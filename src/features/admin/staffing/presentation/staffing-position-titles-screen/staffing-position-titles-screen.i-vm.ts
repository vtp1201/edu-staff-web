import type {
  CreatePositionTitleInput,
  PatchPositionTitleInput,
  Permission,
  PositionTitle,
} from "../../domain/entities/position-title.entity";
import type { StaffingFailure } from "../../domain/failures/staffing.failure";

export type PositionTitleActionResult =
  | { ok: true; positionTitle: PositionTitle }
  | { ok: false; errorKey: StaffingFailure["type"] };

export type VoidActionResult =
  | { ok: true }
  | { ok: false; errorKey: StaffingFailure["type"] };

export type PositionTitleStatusFilter = "ALL" | "ACTIVE" | "ARCHIVED";

export const ALL_PERMISSIONS: Permission[] = [
  "VIEW_SUBJECT_CONTENT",
  "MANAGE_SUBJECT_CONTENT",
  "VIEW_GRADE_DATA",
  "APPROVE_LESSON_PLAN",
  "VIEW_TEACHER_ASSIGNMENTS",
  "MANAGE_TEACHER_ASSIGNMENTS",
];

export interface StaffingPositionTitlesScreenProps {
  initialPositionTitles: PositionTitle[];
  isAdmin: boolean;
  onCreatePositionTitle: (
    input: CreatePositionTitleInput,
  ) => Promise<PositionTitleActionResult>;
  onPatchPositionTitle: (
    id: string,
    input: PatchPositionTitleInput,
  ) => Promise<PositionTitleActionResult>;
  onArchivePositionTitle: (id: string) => Promise<VoidActionResult>;
}
