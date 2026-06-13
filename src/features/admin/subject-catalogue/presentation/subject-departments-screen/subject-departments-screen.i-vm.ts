import type {
  CreateParentInput,
  PatchParentInput,
  SubjectParent,
} from "../../domain/entities/subject-parent.entity";

export type ParentActionResult =
  | { ok: true; parent: SubjectParent }
  | { ok: false; errorKey: string };

export type VoidActionResult = { ok: true } | { ok: false; errorKey: string };

export interface SubjectDepartmentsScreenProps {
  initialParents: SubjectParent[];
  onCreateParent: (data: CreateParentInput) => Promise<ParentActionResult>;
  onPatchParent: (
    id: string,
    data: PatchParentInput,
  ) => Promise<ParentActionResult>;
  onArchiveParent: (
    id: string,
    parent: SubjectParent,
  ) => Promise<VoidActionResult>;
  onRestoreParent: (id: string) => Promise<VoidActionResult>;
}

export type StatusFilter = "ALL" | "ACTIVE" | "ARCHIVED";
