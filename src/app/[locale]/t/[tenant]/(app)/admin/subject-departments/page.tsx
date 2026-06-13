import { makeSubjectCatalogueRepository } from "@/bootstrap/di/subject-catalogue.di";
import { SubjectDepartmentsScreen } from "@/features/admin/subject-catalogue/presentation/subject-departments-screen/subject-departments-screen";
import {
  archiveParentAction,
  createParentAction,
  patchParentAction,
  restoreParentAction,
} from "./actions";

export default async function SubjectDepartmentsPage() {
  const repo = await makeSubjectCatalogueRepository();
  const result = await repo.listParents();
  const initialParents = result.ok ? result.value : [];

  return (
    <SubjectDepartmentsScreen
      initialParents={initialParents}
      onCreateParent={createParentAction}
      onPatchParent={patchParentAction}
      onArchiveParent={(id) => archiveParentAction(id)}
      onRestoreParent={restoreParentAction}
    />
  );
}
