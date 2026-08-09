import { getRankBand } from "@/features/grades/domain/use-cases/rank-band";
import type {
  SubjectColumnScore,
  SubjectScore,
  TermRecord,
} from "../../domain/entities/academic-record.entity";
import { calculateSubjectAvg } from "../../domain/use-cases/calculate-subject-avg";
import type { AcademicRecordRowDto } from "../dtos/academic-record-response.dto";

/**
 * Decimal STRINGS on the wire (`coefficient`, `value`, `termAverage`) →
 * numbers. An empty/unparseable string is `null`, never `0` — a missing score
 * and a zero score are different facts in a học bạ.
 */
function parseDecimal(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Absent optional wire key (Go `omitempty`) → explicit `null`. */
function orNull(raw: string | undefined): string | null {
  return raw === undefined ? null : raw;
}

/**
 * Maps ONE `(classId, termId)` wire record to a {@link TermRecord}, rolling the
 * DYNAMIC `gradeSnapshot` column array up per subject.
 *
 * `subjectNames` / `termNames` are the OPTIONAL catalogue + calendar lookups
 * composed in `bootstrap/di` — an unresolved entry keeps a `null` name
 * (presentation owns the placeholder); a raw uuid must never reach a label.
 */
export function mapAcademicRecordRow(
  dto: AcademicRecordRowDto,
  subjectNames: Map<string, string>,
  termNames: Map<string, string> = new Map(),
): TermRecord {
  const bySubject = new Map<string, SubjectColumnScore[]>();
  for (const snapshotItem of dto.gradeSnapshot ?? []) {
    const column: SubjectColumnScore = {
      columnId: snapshotItem.columnId,
      columnName: snapshotItem.columnName,
      columnType: snapshotItem.columnType,
      coefficient: parseDecimal(snapshotItem.coefficient),
      value: parseDecimal(snapshotItem.value),
    };
    const existing = bySubject.get(snapshotItem.subjectId);
    if (existing) existing.push(column);
    else bySubject.set(snapshotItem.subjectId, [column]);
  }

  const subjects: SubjectScore[] = [...bySubject.entries()].map(
    ([subjectId, columns]) => {
      const termAvg = calculateSubjectAvg(columns);
      return {
        subjectId,
        subjectName: subjectNames.get(subjectId) ?? null,
        columns,
        termAvg,
        rankBand: getRankBand(termAvg),
      };
    },
  );

  return {
    classId: dto.classId,
    termId: dto.termId,
    // The wire carries no term name, so the section heading printed the raw
    // uuid; resolved from the calendar in `bootstrap/di` (same composition as
    // `subjectNames`).
    termName: termNames.get(dto.termId) ?? null,
    // Denormalized by BE (US-E18.56). Absent on an unhealed pre-migration row
    // → `null`, which the year grouping degrades into its unresolved bucket.
    academicYear: orNull(dto.academicYear),
    status: dto.status,
    sealedAt: orNull(dto.sealedAt),
    sealedBy: orNull(dto.sealedBy),
    unsealedAt: orNull(dto.unsealedAt),
    unsealedBy: orNull(dto.unsealedBy),
    unsealReason: orNull(dto.unsealReason),
    resealCount: dto.resealCount,
    subjects,
    // The server-computed `termAverage` is what was FROZEN at seal time — it
    // wins over any client recomputation. Fall back to the mean of the subject
    // averages only when the server sent none.
    gpa: parseDecimal(dto.termAverage) ?? deriveGpa(subjects),
  };
}

function deriveGpa(subjects: SubjectScore[]): number | null {
  const averages = subjects
    .map((s) => s.termAvg)
    .filter((v): v is number => v !== null);
  if (averages.length === 0) return null;
  const mean = averages.reduce((a, b) => a + b, 0) / averages.length;
  return Math.round(mean * 100) / 100;
}
