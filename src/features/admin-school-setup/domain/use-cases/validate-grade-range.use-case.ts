export type GradeRangeValidationError =
  | "required"
  | "not-integer"
  | "out-of-range"
  | "min-exceeds-max";

export interface ValidateGradeRangeInput {
  minGrade: string | number;
  maxGrade: string | number;
}

export function validateGradeRange(
  input: ValidateGradeRangeInput,
): GradeRangeValidationError | null {
  const mn = Number(input.minGrade);
  const mx = Number(input.maxGrade);
  if (input.minGrade === "" || input.maxGrade === "") return "required";
  if (!Number.isInteger(mn) || !Number.isInteger(mx)) return "not-integer";
  if (mn < 1 || mx > 13) return "out-of-range";
  if (mn > mx) return "min-exceeds-max";
  return null;
}

export function isNarrowingRange(
  current: { minGrade: number; maxGrade: number } | null,
  draft: { minGrade: number; maxGrade: number },
): boolean {
  if (!current) return false;
  return draft.minGrade > current.minGrade || draft.maxGrade < current.maxGrade;
}
