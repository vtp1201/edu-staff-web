"use server";

import {
  makeArchiveParentUseCase,
  makeSubjectCatalogueRepository,
} from "@/bootstrap/di/subject-catalogue.di";
import type {
  CreateParentInput,
  PatchParentInput,
} from "@/features/admin/subject-catalogue/domain/entities/subject-parent.entity";

export async function createParentAction(data: CreateParentInput) {
  const repo = await makeSubjectCatalogueRepository();
  const result = await repo.createParent(data);
  if (!result.ok) return { ok: false as const, errorKey: result.failure.type };
  return { ok: true as const, parent: result.value };
}

export async function patchParentAction(id: string, data: PatchParentInput) {
  const repo = await makeSubjectCatalogueRepository();
  const result = await repo.patchParent(id, data);
  if (!result.ok) return { ok: false as const, errorKey: result.failure.type };
  return { ok: true as const, parent: result.value };
}

export async function archiveParentAction(id: string) {
  const repo = await makeSubjectCatalogueRepository();
  const parents = await repo.listParents();
  if (!parents.ok)
    return { ok: false as const, errorKey: parents.failure.type };
  const parent = parents.value.find((p) => p.id === id);
  if (!parent) return { ok: false as const, errorKey: "not-found" };

  const useCase = await makeArchiveParentUseCase();
  const result = await useCase.execute(id, parent);
  if (!result.ok) return { ok: false as const, errorKey: result.failure.type };
  return { ok: true as const };
}

export async function restoreParentAction(id: string) {
  const repo = await makeSubjectCatalogueRepository();
  const result = await repo.restoreParent(id);
  if (!result.ok) return { ok: false as const, errorKey: result.failure.type };
  return { ok: true as const };
}
