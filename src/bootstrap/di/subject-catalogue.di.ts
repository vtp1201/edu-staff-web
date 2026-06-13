import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { ISubjectCatalogueRepository } from "@/features/admin/subject-catalogue/domain/repositories/i-subject-catalogue.repository";
import { ArchiveParentUseCase } from "@/features/admin/subject-catalogue/domain/use-cases/archive-parent.use-case";
import { ArchiveSubjectUseCase } from "@/features/admin/subject-catalogue/domain/use-cases/archive-subject.use-case";
import { CreateSubjectUseCase } from "@/features/admin/subject-catalogue/domain/use-cases/create-subject.use-case";
import { PatchSubjectUseCase } from "@/features/admin/subject-catalogue/domain/use-cases/patch-subject.use-case";
import { MockSubjectCatalogueRepository } from "@/features/admin/subject-catalogue/infrastructure/repositories/mocks/subject-catalogue.mock.repository";
import { SubjectCatalogueRepository } from "@/features/admin/subject-catalogue/infrastructure/repositories/subject-catalogue.repository";

async function makeRepo(): Promise<ISubjectCatalogueRepository> {
  if (USE_MOCK) return new MockSubjectCatalogueRepository();
  return new SubjectCatalogueRepository(await createServerHttpClient());
}

export async function makeSubjectCatalogueRepository(): Promise<ISubjectCatalogueRepository> {
  return makeRepo();
}

export async function makeCreateSubjectUseCase() {
  return new CreateSubjectUseCase(await makeRepo());
}

export async function makePatchSubjectUseCase() {
  return new PatchSubjectUseCase(await makeRepo());
}

export async function makeArchiveParentUseCase() {
  return new ArchiveParentUseCase(await makeRepo());
}

export async function makeArchiveSubjectUseCase() {
  return new ArchiveSubjectUseCase(await makeRepo());
}
