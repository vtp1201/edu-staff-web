import type { ClassSubject } from "../../domain/entities/class-subject.entity";
import type {
  PatchSubjectInput,
  Subject,
} from "../../domain/entities/subject.entity";
import type { VoidActionResult } from "../subject-departments-screen/subject-departments-screen.i-vm";
import type { SubjectActionResult } from "./subjects-screen.i-vm";

/**
 * ViewModel for the deep-linkable full-page subject master editor
 * `/admin/subjects/[id]` (US-E12.13).
 */
export interface SubjectDetailScreenProps {
  /** `null` = not found OR not visible to this tenant — same inline state. */
  subject: Subject | null;
  /** Breadcrumb department name; empty when it could not be resolved. */
  parentName: string;
  classOfferings: ClassSubject[];
  /** Tenant-scoped `/admin/subjects` path for the breadcrumb / back action. */
  backHref: string;
  onSave: (id: string, data: PatchSubjectInput) => Promise<SubjectActionResult>;
  onArchive: (id: string) => Promise<VoidActionResult>;
}
