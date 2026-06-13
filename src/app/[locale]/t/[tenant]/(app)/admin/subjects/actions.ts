"use server";

import {
  makeArchiveSubjectUseCase,
  makeCreateSubjectUseCase,
  makePatchSubjectUseCase,
  makeSubjectCatalogueRepository,
} from "@/bootstrap/di/subject-catalogue.di";
import type {
  CreateSubjectInput,
  PatchSubjectInput,
} from "@/features/admin/subject-catalogue/domain/entities/subject.entity";
import type { CreateParentInput } from "@/features/admin/subject-catalogue/domain/entities/subject-parent.entity";

export async function createParentAction(data: CreateParentInput) {
  const repo = await makeSubjectCatalogueRepository();
  const result = await repo.createParent(data);
  if (!result.ok) return { ok: false as const, errorKey: result.failure.type };
  return { ok: true as const, parent: result.value };
}

export async function createSubjectAction(data: CreateSubjectInput) {
  const useCase = await makeCreateSubjectUseCase();
  const result = await useCase.execute(data);
  if (!result.ok) return { ok: false as const, errorKey: result.failure.type };
  return { ok: true as const, subject: result.value };
}

export async function getSubjectAction(id: string) {
  const repo = await makeSubjectCatalogueRepository();
  const result = await repo.getSubject(id);
  if (!result.ok) return { ok: false as const, errorKey: result.failure.type };
  return {
    ok: true as const,
    subject: result.value.subject,
    classOfferings: result.value.classOfferings,
  };
}

export async function patchSubjectAction(id: string, data: PatchSubjectInput) {
  const useCase = await makePatchSubjectUseCase();
  const result = await useCase.execute(id, data);
  if (!result.ok) return { ok: false as const, errorKey: result.failure.type };
  return { ok: true as const, subject: result.value };
}

export async function archiveSubjectAction(id: string) {
  const repo = await makeSubjectCatalogueRepository();
  const found = await repo.getSubject(id);
  if (!found.ok) return { ok: false as const, errorKey: found.failure.type };

  const useCase = await makeArchiveSubjectUseCase();
  const result = await useCase.execute(id, found.value.subject);
  if (!result.ok) return { ok: false as const, errorKey: result.failure.type };
  return { ok: true as const };
}
