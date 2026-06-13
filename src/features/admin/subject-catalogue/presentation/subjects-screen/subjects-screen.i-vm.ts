import type { ClassSubject } from "../../domain/entities/class-subject.entity";
import type {
  CreateSubjectInput,
  PatchSubjectInput,
  Subject,
} from "../../domain/entities/subject.entity";
import type {
  CreateParentInput,
  SubjectParent,
} from "../../domain/entities/subject-parent.entity";
import type {
  ParentActionResult,
  VoidActionResult,
} from "../subject-departments-screen/subject-departments-screen.i-vm";

export interface GradeRange {
  minGrade: number;
  maxGrade: number;
}

export interface ParentWithSubjectsVM extends SubjectParent {
  subjects: Subject[];
}

export type SubjectActionResult =
  | { ok: true; subject: Subject }
  | { ok: false; errorKey: string };

export type GetSubjectResult =
  | { ok: true; subject: Subject; classOfferings: ClassSubject[] }
  | { ok: false; errorKey: string };

export interface SubjectsScreenProps {
  initialParents: ParentWithSubjectsVM[];
  gradeRange: GradeRange | null;
  onCreateParent: (data: CreateParentInput) => Promise<ParentActionResult>;
  onCreateSubject: (data: CreateSubjectInput) => Promise<SubjectActionResult>;
  onGetSubject: (id: string) => Promise<GetSubjectResult>;
  onPatchSubject: (
    id: string,
    data: PatchSubjectInput,
  ) => Promise<SubjectActionResult>;
  onArchiveSubject: (id: string, subject: Subject) => Promise<VoidActionResult>;
}
