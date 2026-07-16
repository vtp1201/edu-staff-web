export type GradeScaleType = "SCALE_10" | "SCALE_4" | "LETTER";

export interface GradeScaleBand {
  id: string;
  label: string; // "Giỏi", "Khá", "A", etc.
  minThreshold: number; // inclusive lower bound
  colorToken: "success" | "primary" | "warning" | "error"; // maps to edu-* tokens
}

export interface GradeScale {
  type: GradeScaleType;
  maxScore: number; // 10 for SCALE_10, 4 for SCALE_4, 100 for LETTER (normalized %)
  bands: GradeScaleBand[];
  /**
   * ISO date-time the scale takes effect (wire field `effectiveFrom`, US-E18.7).
   * Round-tripped from the last GET; defaulted to "now" on a first-ever save.
   */
  effectiveFrom: string;
}

/**
 * Deterministic placeholder `effectiveFrom` for the compile-time presets
 * (never `Date.now()` so presets stay pure/deterministic). Overwritten by the
 * real wire value on read, or by "now" on first save (see mapper / actions).
 */
export const PRESET_EFFECTIVE_FROM = "2024-09-01T00:00:00.000Z";

// Presets
export const GRADE_SCALE_PRESETS: Record<GradeScaleType, GradeScale> = {
  SCALE_10: {
    type: "SCALE_10",
    maxScore: 10,
    effectiveFrom: PRESET_EFFECTIVE_FROM,
    bands: [
      {
        id: "xuat-sac",
        label: "Xuất sắc",
        minThreshold: 9.5,
        colorToken: "success",
      },
      { id: "gioi", label: "Giỏi", minThreshold: 8.0, colorToken: "success" },
      { id: "kha", label: "Khá", minThreshold: 6.5, colorToken: "primary" },
      {
        id: "tb",
        label: "Trung bình",
        minThreshold: 5.0,
        colorToken: "warning",
      },
      { id: "yeu", label: "Yếu", minThreshold: 0, colorToken: "error" },
    ],
  },
  SCALE_4: {
    type: "SCALE_4",
    maxScore: 4,
    effectiveFrom: PRESET_EFFECTIVE_FROM,
    bands: [
      { id: "a-plus", label: "A+", minThreshold: 3.7, colorToken: "success" },
      { id: "a", label: "A", minThreshold: 3.3, colorToken: "success" },
      { id: "b-plus", label: "B+", minThreshold: 3.0, colorToken: "primary" },
      { id: "b", label: "B", minThreshold: 2.7, colorToken: "primary" },
      { id: "c", label: "C", minThreshold: 2.0, colorToken: "warning" },
      { id: "d", label: "D", minThreshold: 1.0, colorToken: "warning" },
      { id: "f", label: "F", minThreshold: 0, colorToken: "error" },
    ],
  },
  LETTER: {
    type: "LETTER",
    maxScore: 100,
    effectiveFrom: PRESET_EFFECTIVE_FROM,
    bands: [
      { id: "a", label: "A", minThreshold: 90, colorToken: "success" },
      { id: "b", label: "B", minThreshold: 80, colorToken: "primary" },
      { id: "c", label: "C", minThreshold: 70, colorToken: "warning" },
      { id: "d", label: "D", minThreshold: 60, colorToken: "warning" },
      { id: "f", label: "F", minThreshold: 0, colorToken: "error" },
    ],
  },
};
