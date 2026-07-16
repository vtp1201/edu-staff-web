import type {
  AssessmentColumn,
  AssessmentScheme,
  ColumnType,
  SubjectForGrade,
} from "../../domain/entities/assessment-scheme.entity";
import type {
  GradeScale,
  GradeScaleBand,
  GradeScaleType,
} from "../../domain/entities/grade-scale.entity";
import { GRADE_SCALE_PRESETS } from "../../domain/entities/grade-scale.entity";
import type {
  AssessmentColumnRequestDto,
  AssessmentSchemeResponseDto,
  GradeScaleResponseDto,
  SetAssessmentSchemeRequestDto,
  SetGradeScaleRequestDto,
  SubjectForGradeDto,
  WireColumnType,
  WireLetterGrade,
  WireScaleType,
} from "../dtos/assessment-scheme-response.dto";

// ─── Grade scale ─────────────────────────────────────────────────────────────

const WIRE_TO_DOMAIN_SCALE: Record<WireScaleType, GradeScaleType> = {
  HE_10: "SCALE_10",
  HE_4_GPA: "SCALE_4",
  LETTER_ABCD: "LETTER",
};

const DOMAIN_TO_WIRE_SCALE: Record<GradeScaleType, WireScaleType> = {
  SCALE_10: "HE_10",
  SCALE_4: "HE_4_GPA",
  LETTER: "LETTER_ABCD",
};

/** Per-type fallback maxScore when the wire omits `maxValue`. */
const DEFAULT_MAX_SCORE: Record<GradeScaleType, number> = {
  SCALE_10: 10,
  SCALE_4: 4,
  LETTER: 100,
};

function toDomainScaleType(raw: WireScaleType): GradeScaleType {
  return WIRE_TO_DOMAIN_SCALE[raw] ?? "SCALE_10";
}

/**
 * Deterministic rank → colorToken: 1st `success`, 2nd `primary`, last `error`,
 * everything in between `warning`. Cosmetic only (bands are never sent back for
 * numeric scales; letter bands re-derive on read). See ADR 0053.
 */
function rankColorToken(
  index: number,
  total: number,
): GradeScaleBand["colorToken"] {
  if (index === 0) return "success";
  if (index === total - 1) return "error";
  if (index === 1) return "primary";
  return "warning";
}

function bandsFromLetterGrades(letters: WireLetterGrade[]): GradeScaleBand[] {
  const sorted = [...letters].sort(
    (a, b) => Number(b.minScore ?? 0) - Number(a.minScore ?? 0),
  );
  return sorted.map((g, i) => ({
    id: g.letter.toLowerCase(),
    label: g.letter,
    minThreshold: Number(g.minScore ?? 0),
    colorToken: rankColorToken(i, sorted.length),
  }));
}

export function mapGradeScale(dto: GradeScaleResponseDto): GradeScale {
  const type = toDomainScaleType(dto.scaleType);
  const parsedMax = Number(dto.maxValue);
  const maxScore =
    dto.maxValue !== undefined && !Number.isNaN(parsedMax)
      ? parsedMax
      : DEFAULT_MAX_SCORE[type];

  // LETTER_ABCD with real letters → derive bands; otherwise reuse the local
  // preset bands (BE carries no bands for numeric scales — ADR 0053).
  const bands =
    type === "LETTER" && dto.letterGrades && dto.letterGrades.length > 0
      ? bandsFromLetterGrades(dto.letterGrades)
      : GRADE_SCALE_PRESETS[type].bands;

  return {
    type,
    maxScore,
    bands,
    effectiveFrom: dto.effectiveFrom,
  };
}

export function toSetGradeScaleRequestDto(
  scale: GradeScale,
): SetGradeScaleRequestDto {
  const req: SetGradeScaleRequestDto = {
    scaleType: DOMAIN_TO_WIRE_SCALE[scale.type],
    minValue: "0",
    maxValue: String(scale.maxScore),
    effectiveFrom: scale.effectiveFrom,
  };

  if (scale.type === "LETTER") {
    // Sort bands desc by threshold; each band's window runs from its own
    // threshold up to (the next-higher band's threshold − 0.1), the top band
    // capping at scale.maxScore.
    const desc = [...scale.bands].sort(
      (a, b) => b.minThreshold - a.minThreshold,
    );
    req.letterGrades = desc.map((band, i) => ({
      letter: band.label,
      minScore: band.minThreshold.toFixed(1),
      maxScore:
        i === 0
          ? scale.maxScore.toFixed(1)
          : (desc[i - 1].minThreshold - 0.1).toFixed(1),
    }));
  }

  return req;
}

// ─── Assessment scheme ───────────────────────────────────────────────────────

const KNOWN_COLUMN_TYPES: ReadonlySet<string> = new Set<ColumnType>([
  "TX",
  "GK",
  "CK",
]);

function toColumnType(raw: WireColumnType): ColumnType {
  return KNOWN_COLUMN_TYPES.has(raw) ? (raw as ColumnType) : "TX";
}

export function mapAssessmentScheme(
  dto: AssessmentSchemeResponseDto,
): AssessmentScheme {
  const columns: AssessmentColumn[] = [...dto.columns]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((c) => ({
      id: c.columnId,
      type: toColumnType(c.columnType),
      label: c.name,
      // `count` has no wire representation — fixed non-persistent default of 1
      // (ADR 0053; never sent back on write).
      count: 1,
      weight: c.coefficient * 10,
    }));
  return {
    subjectId: dto.subjectId,
    yearLabel: dto.academicYearLabel,
    termId: dto.termId,
    columns,
  };
}

export function toSetAssessmentSchemeRequestDto(
  scheme: AssessmentScheme,
): SetAssessmentSchemeRequestDto {
  const columns: AssessmentColumnRequestDto[] = scheme.columns.map(
    (c, index) => ({
      name: c.label,
      columnType: c.type,
      coefficient: c.weight / 10,
      ordinal: index + 1,
    }),
  );
  // subjectId / yearLabel / termId are path params only — not in the body.
  return { columns };
}

// ─── Subjects (UNCHANGED — mock-first, out of US-E18.7 scope) ────────────────

export function mapSubjectForGrade(dto: SubjectForGradeDto): SubjectForGrade {
  return {
    id: dto.id,
    name: dto.name,
    gradeLevel: dto.gradeLevel,
    requiredAssessmentCount: dto.requiredAssessmentCount,
  };
}
