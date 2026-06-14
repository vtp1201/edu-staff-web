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
  "MANAGE_SUBJECT_CONTENT",
  "MANAGE_SCHEDULE",
  "MANAGE_CONDUCT",
  "VIEW_REPORTS",
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
