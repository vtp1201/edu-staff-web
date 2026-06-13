import type { ClassSubject } from "../entities/class-subject.entity";
import type {
  CreateSubjectInput,
  PatchSubjectInput,
  Subject,
} from "../entities/subject.entity";
import type {
  CreateParentInput,
  PatchParentInput,
  SubjectParent,
} from "../entities/subject-parent.entity";
import type { SubjectCatalogueFailure } from "../failures/subject-catalogue.failure";
import type { Result } from "../use-cases/result";

export interface ISubjectCatalogueRepository {
  listParents(): Promise<Result<SubjectParent[], SubjectCatalogueFailure>>;
  createParent(
    data: CreateParentInput,
  ): Promise<Result<SubjectParent, SubjectCatalogueFailure>>;
  patchParent(
    id: string,
    data: PatchParentInput,
  ): Promise<Result<SubjectParent, SubjectCatalogueFailure>>;
  archiveParent(id: string): Promise<Result<void, SubjectCatalogueFailure>>;
  restoreParent(id: string): Promise<Result<void, SubjectCatalogueFailure>>;
  listSubjects(
    parentId: string,
  ): Promise<Result<Subject[], SubjectCatalogueFailure>>;
  createSubject(
    data: CreateSubjectInput,
  ): Promise<Result<Subject, SubjectCatalogueFailure>>;
  getSubject(
    id: string,
  ): Promise<
    Result<
      { subject: Subject; classOfferings: ClassSubject[] },
      SubjectCatalogueFailure
    >
  >;
  patchSubject(
    id: string,
    data: PatchSubjectInput,
  ): Promise<Result<Subject, SubjectCatalogueFailure>>;
  archiveSubject(id: string): Promise<Result<void, SubjectCatalogueFailure>>;
}
