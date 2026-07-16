import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";

/**
 * Term-lock admin action (US-E18.12, ADR 0054 §3.2) — kept as a SEPARATE
 * interface from {@link IGradesRepository} since it's an ADMIN/MANAGER action
 * orthogonal to the teacher-entry flow, has no per-cell target, and is the
 * one genuinely bulk operation on the wire (`POST .../lock` locks every
 * PUBLISHED entry for the whole class+subject+term at once — irreversible).
 */
export interface IGradesTermRepository {
  /** Returns the count of newly-locked entries. Irreversible. */
  lockTerm(key: ClassSubjectTermKey): Promise<{ lockedCount: number }>;
}
