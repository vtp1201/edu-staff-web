import { makeSchoolConfigRepository } from "@/bootstrap/di/admin-school-setup.di";
import { makeSubjectCatalogueRepository } from "@/bootstrap/di/subject-catalogue.di";
import { SubjectsScreen } from "@/features/admin/subject-catalogue/presentation/subjects-screen/subjects-screen";
import type {
  GradeRange,
  ParentWithSubjectsVM,
} from "@/features/admin/subject-catalogue/presentation/subjects-screen/subjects-screen.i-vm";
import {
  archiveSubjectAction,
  createParentAction,
  createSubjectAction,
  getSubjectAction,
  patchSubjectAction,
} from "./actions";

export default async function SubjectsPage() {
  const [catalogueRepo, schoolRepo] = await Promise.all([
    makeSubjectCatalogueRepository(),
    makeSchoolConfigRepository(),
  ]);

  const [parentsResult, configResult] = await Promise.all([
    catalogueRepo.listParents(),
    schoolRepo.getConfig(),
  ]);

  const parents = parentsResult.ok ? parentsResult.value : [];

  // Compose full parent+subjects view (cross-call at composition layer).
  const initialParents: ParentWithSubjectsVM[] = await Promise.all(
    parents.map(async (parent) => {
      const subjectsResult = await catalogueRepo.listSubjects(parent.id);
      return {
        ...parent,
        subjects: subjectsResult.ok ? subjectsResult.value : [],
      };
    }),
  );

  const gradeRange: GradeRange | null =
    configResult.ok && configResult.data.gradeLevelRange
      ? {
          minGrade: configResult.data.gradeLevelRange.minGrade,
          maxGrade: configResult.data.gradeLevelRange.maxGrade,
        }
      : null;

  return (
    <SubjectsScreen
      initialParents={initialParents}
      gradeRange={gradeRange}
      onCreateParent={createParentAction}
      onCreateSubject={createSubjectAction}
      onGetSubject={getSubjectAction}
      onPatchSubject={patchSubjectAction}
      onArchiveSubject={(id) => archiveSubjectAction(id)}
    />
  );
}
