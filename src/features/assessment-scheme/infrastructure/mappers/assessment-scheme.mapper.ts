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
import type {
  AssessmentSchemeResponseDto,
  GradeScaleResponseDto,
  SubjectForGradeDto,
} from "../dtos/assessment-scheme-response.dto";

const KNOWN_SCALE_TYPES: ReadonlySet<string> = new Set<GradeScaleType>([
  "SCALE_10",
  "SCALE_4",
  "LETTER",
]);

const KNOWN_COLOR_TOKENS: ReadonlySet<string> = new Set<
  GradeScaleBand["colorToken"]
>(["success", "primary", "warning", "error"]);

const KNOWN_COLUMN_TYPES: ReadonlySet<string> = new Set<ColumnType>([
  "TX",
  "GK",
  "CK",
]);

function toScaleType(raw: string): GradeScaleType {
  return KNOWN_SCALE_TYPES.has(raw) ? (raw as GradeScaleType) : "SCALE_10";
}

function toColorToken(raw: string): GradeScaleBand["colorToken"] {
  return KNOWN_COLOR_TOKENS.has(raw)
    ? (raw as GradeScaleBand["colorToken"])
    : "primary";
}

function toColumnType(raw: string): ColumnType {
  return KNOWN_COLUMN_TYPES.has(raw) ? (raw as ColumnType) : "TX";
}

export function mapGradeScale(dto: GradeScaleResponseDto): GradeScale {
  const bands: GradeScaleBand[] = dto.bands.map((b) => ({
    id: b.id,
    label: b.label,
    minThreshold: b.minThreshold,
    colorToken: toColorToken(b.colorToken),
  }));
  return {
    type: toScaleType(dto.type),
    maxScore: dto.maxScore,
    bands,
  };
}

export function mapAssessmentScheme(
  dto: AssessmentSchemeResponseDto,
): AssessmentScheme {
  const columns: AssessmentColumn[] = dto.columns.map((c) => ({
    id: c.id,
    type: toColumnType(c.type),
    label: c.label,
    count: c.count,
    weight: c.weight,
  }));
  return {
    subjectId: dto.subjectId,
    yearLabel: dto.yearLabel,
    columns,
  };
}

export function mapSubjectForGrade(dto: SubjectForGradeDto): SubjectForGrade {
  return {
    id: dto.id,
    name: dto.name,
    gradeLevel: dto.gradeLevel,
    requiredAssessmentCount: dto.requiredAssessmentCount,
  };
}
