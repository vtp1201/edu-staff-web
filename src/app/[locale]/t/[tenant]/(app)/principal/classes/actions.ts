"use server";

import { makePrincipalClassesRepository } from "@/bootstrap/di/principal-classes.di";
import type { LoadMoreResult } from "@/features/principal/presentation/classes/principal-classes-screen.i-vm";

const PAGE_SIZE = 100;

/**
 * Cursor "load more" for the principal class list (US-E13.8, FR-007).
 * Returns a stable `errorKey` on failure — no translation at this boundary
 * (`.claude/rules/i18n.md`); the screen renders `t(\`errors.${errorKey}\`)`.
 */
export async function loadMoreClassesAction(
  academicYear: string,
  cursor: string,
): Promise<LoadMoreResult> {
  const repo = await makePrincipalClassesRepository();
  const result = await repo.listClasses({
    academicYear,
    cursor,
    limit: PAGE_SIZE,
  });
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, data: result.value };
}
