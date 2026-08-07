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
  SubjectListItemDto,
  WireColumnType,
  WireGradeBand,
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
 * everything in between `warning`. Cosmetic only — `colorToken` (like the band
 * `id`) has no wire representation, so it is re-derived from rank on every read
 * of both letter grades and the real numeric `bands` (US-E18.49).
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

/**
 * Real persisted `bands` of a NUMERIC scale (BE US-189) → domain bands.
 * `minThreshold` is a wire decimal string. Returns `null` when the payload is
 * unusable (any unparseable threshold) so the caller falls back to the preset
 * rather than inventing a `0` band out of a `NaN`.
 */
function bandsFromWire(wire: WireGradeBand[]): GradeScaleBand[] | null {
  const parsed = wire.map((b) => ({
    label: b.label,
    minThreshold: Number(b.minThreshold),
  }));
  if (parsed.some((b) => !Number.isFinite(b.minThreshold))) return null;

  // Highest-first is the BE's own invariant; re-sort defensively so the
  // rank-derived colorToken is right even for an out-of-order payload.
  const sorted = parsed.sort((a, b) => b.minThreshold - a.minThreshold);
  return sorted.map((b, i) => ({
    // No wire id — index within the highest-first order is stable and cannot
    // collide the way a label slug could.
    id: `band-${i + 1}`,
    label: b.label,
    minThreshold: b.minThreshold,
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

  // LETTER_ABCD grades by letter — `letterGrades` stays authoritative there and
  // a stray `bands` array (which the BE 422s) must never override it.
  // Numeric scales carry REAL persisted `bands` since BE US-189 (US-E18.49);
  // the preset is only a fallback for a tenant that never customised them.
  const bands =
    type === "LETTER"
      ? dto.letterGrades && dto.letterGrades.length > 0
        ? bandsFromLetterGrades(dto.letterGrades)
        : GRADE_SCALE_PRESETS[type].bands
      : ((dto.bands && dto.bands.length > 0
          ? bandsFromWire(dto.bands)
          : null) ?? GRADE_SCALE_PRESETS[type].bands);

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
  } else if (scale.bands.length > 0) {
    // Numeric scale: bands ARE persisted (BE US-189 / US-E18.49). Before this,
    // nothing was sent and every admin customisation was silently discarded.
    // Highest-first with strictly decreasing thresholds is a BE invariant; the
    // decimal-string encoding matches minValue/maxValue.
    req.bands = [...scale.bands]
      .sort((a, b) => b.minThreshold - a.minThreshold)
      .map((band) => ({
        label: band.label.trim(),
        // Exact value, NOT `.toFixed(1)` — a numeric-scale threshold is a
        // real value the read path already parses with full precision
        // (`Number(dto.minThreshold)`), so rounding here would silently
        // truncate anything finer than 1 decimal (e.g. a GPA cutoff like
        // 3.25) even though the wire field allows up to 16 chars.
        minThreshold: String(band.minThreshold),
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
      // `requiredCount` is real and persisted (BE US-189 / US-E18.49). It is
      // OMITTED from the response when unspecified — map that absence to `null`
      // (unset), never to the old hardcoded `1`.
      count: typeof c.requiredCount === "number" ? c.requiredCount : null,
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
      // Conditional spread = the key is absent (not `null`) when unset, which is
      // how the BE reads "unspecified" (US-E18.49).
      ...(c.count !== null ? { requiredCount: c.count } : {}),
    }),
  );
  // subjectId / yearLabel / termId are path params only — not in the body.
  return { columns };
}

// ─── Subjects (real `GET /subjects`, US-E18.42 / BE US-177) ──────────────────

/**
 * `SubjectResponse` → `SubjectForGrade`. The wire ids as `subjectId` and nests
 * the assessment count under `master.requiredExamCount`; the BE always
 * serialises `master` and uses `0` for "unset", so both absent and `0` collapse
 * to `null` (same convention as subject-catalogue's mapper, US-E18.3).
 */
export function mapSubjectForGrade(dto: SubjectListItemDto): SubjectForGrade {
  const required = dto.master?.requiredExamCount;
  return {
    id: dto.subjectId,
    name: dto.name,
    gradeLevel: dto.gradeLevel,
    requiredAssessmentCount:
      required !== undefined && required > 0 ? required : null,
  };
}
