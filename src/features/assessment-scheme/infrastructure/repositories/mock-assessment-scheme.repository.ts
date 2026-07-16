import "server-only";
import type {
  AssessmentScheme,
  SubjectForGrade,
} from "../../domain/entities/assessment-scheme.entity";
import { TT22_PRESET } from "../../domain/entities/assessment-scheme.entity";
import type { GradeScale } from "../../domain/entities/grade-scale.entity";
import { GRADE_SCALE_PRESETS } from "../../domain/entities/grade-scale.entity";
import type { AssessmentSchemeFailure } from "../../domain/failures/assessment-scheme.failure";
import type { IAssessmentSchemeRepository } from "../../domain/repositories/i-assessment-scheme.repository";

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AssessmentSchemeFailure };

// Module-level mutable seed — survives within a process so saves are observable
// across mock calls during development (decision 0014).
let mockGradeScale: GradeScale = structuredClone(GRADE_SCALE_PRESETS.SCALE_10);

const SUBJECTS_BY_GRADE: Record<number, SubjectForGrade[]> = {
  10: [
    {
      id: "s10-toan",
      name: "Toán",
      gradeLevel: 10,
      requiredAssessmentCount: 4,
    },
    {
      id: "s10-van",
      name: "Ngữ văn",
      gradeLevel: 10,
      requiredAssessmentCount: 4,
    },
    {
      id: "s10-anh",
      name: "Tiếng Anh",
      gradeLevel: 10,
      requiredAssessmentCount: 4,
    },
    {
      id: "s10-ly",
      name: "Vật lí",
      gradeLevel: 10,
      requiredAssessmentCount: 4,
    },
    {
      id: "s10-hoa",
      name: "Hóa học",
      gradeLevel: 10,
      requiredAssessmentCount: 4,
    },
  ],
  11: [
    {
      id: "s11-toan",
      name: "Toán",
      gradeLevel: 11,
      requiredAssessmentCount: 4,
    },
    {
      id: "s11-van",
      name: "Ngữ văn",
      gradeLevel: 11,
      requiredAssessmentCount: 4,
    },
    {
      id: "s11-anh",
      name: "Tiếng Anh",
      gradeLevel: 11,
      requiredAssessmentCount: 4,
    },
    {
      id: "s11-sinh",
      name: "Sinh học",
      gradeLevel: 11,
      requiredAssessmentCount: 4,
    },
  ],
  12: [
    {
      id: "s12-toan",
      name: "Toán",
      gradeLevel: 12,
      requiredAssessmentCount: 4,
    },
    {
      id: "s12-van",
      name: "Ngữ văn",
      gradeLevel: 12,
      requiredAssessmentCount: 4,
    },
    {
      id: "s12-anh",
      name: "Tiếng Anh",
      gradeLevel: 12,
      requiredAssessmentCount: 4,
    },
    {
      id: "s12-su",
      name: "Lịch sử",
      gradeLevel: 12,
      requiredAssessmentCount: 4,
    },
  ],
};

// Keyed by `${subjectId}:${yearLabel}:${termId}` (US-E18.7 — term-scoped).
const mockSchemes = new Map<string, AssessmentScheme>();

function schemeKey(
  subjectId: string,
  yearLabel: string,
  termId: string,
): string {
  return `${subjectId}:${yearLabel}:${termId}`;
}

export class MockAssessmentSchemeRepository
  implements IAssessmentSchemeRepository
{
  async getGradeScale(): Promise<Result<GradeScale>> {
    return { ok: true, data: structuredClone(mockGradeScale) };
  }

  async saveGradeScale(
    scale: GradeScale,
  ): Promise<{ ok: true } | { ok: false; error: AssessmentSchemeFailure }> {
    mockGradeScale = structuredClone(scale);
    return { ok: true };
  }

  async listSubjectsForGrade(
    gradeLevel: number,
  ): Promise<Result<SubjectForGrade[]>> {
    const subjects = SUBJECTS_BY_GRADE[gradeLevel] ?? [];
    return { ok: true, data: structuredClone(subjects) };
  }

  async getAssessmentScheme(
    subjectId: string,
    yearLabel: string,
    termId: string,
  ): Promise<Result<AssessmentScheme>> {
    const existing = mockSchemes.get(schemeKey(subjectId, yearLabel, termId));
    if (existing) return { ok: true, data: structuredClone(existing) };
    // Default to TT22 preset for any not-yet-configured subject/term.
    return {
      ok: true,
      data: {
        subjectId,
        yearLabel,
        termId,
        columns: structuredClone(TT22_PRESET),
      },
    };
  }

  async saveAssessmentScheme(
    scheme: AssessmentScheme,
  ): Promise<{ ok: true } | { ok: false; error: AssessmentSchemeFailure }> {
    mockSchemes.set(
      schemeKey(scheme.subjectId, scheme.yearLabel, scheme.termId),
      structuredClone(scheme),
    );
    return { ok: true };
  }
}
