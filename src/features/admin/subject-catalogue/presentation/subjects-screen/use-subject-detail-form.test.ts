import { describe, expect, it } from "vitest";
import type { Subject } from "../../domain/entities/subject.entity";
import {
  emptyFormValues,
  toFormValues,
  toPatchInput,
} from "./use-subject-detail-form";

/**
 * US-E12.13 Phase 1 — the Sheet's field/validation/save logic is extracted so
 * the new full-page route reuses it verbatim. These cover the pure core of the
 * hook (form-value snapshot + PatchSubjectInput construction); the React
 * binding is proven by the Storybook interaction suites of both consumers.
 *
 * Note: this repo's Vitest project runs in `node` with no
 * `@testing-library/react`, so `renderHook` is not available — the hook is kept
 * intentionally thin over these pure helpers.
 */

const subject: Subject = {
  id: "sub-math-10",
  parentId: "sp-math",
  name: "Toán lớp 10",
  code: "MATH10",
  gradeLevel: 10,
  status: "ACTIVE",
  inUse: true,
  periodCount: 105,
  requiredAssessmentCount: 4,
  outcomeTargets: "Nắm vững đại số",
  masterSyllabus: "https://syllabus.example/math10",
  exerciseBankRef: "EX-M10",
  examBankRef: "EXAM-M10",
};

describe("toFormValues", () => {
  it("snapshots every editable field as a string", () => {
    expect(toFormValues(subject)).toEqual({
      name: "Toán lớp 10",
      code: "MATH10",
      periodCount: "105",
      assessCount: "4",
      outcome: "Nắm vững đại số",
      syllabus: "https://syllabus.example/math10",
      exercise: "EX-M10",
      exam: "EXAM-M10",
    });
  });

  it("maps null code / counts to empty strings (not the literal 'null')", () => {
    const values = toFormValues({
      ...subject,
      code: null,
      periodCount: null,
      requiredAssessmentCount: null,
    });
    expect(values.code).toBe("");
    expect(values.periodCount).toBe("");
    expect(values.assessCount).toBe("");
  });

  it("returns blank values for a null subject", () => {
    expect(toFormValues(null)).toEqual(emptyFormValues());
  });
});

describe("toPatchInput", () => {
  it("trims the name and keeps the numeric fields numeric", () => {
    const patch = toPatchInput({
      ...toFormValues(subject),
      name: "  Toán lớp 10  ",
    });
    expect(patch).toEqual({
      name: "Toán lớp 10",
      code: "MATH10",
      periodCount: 105,
      requiredAssessmentCount: 4,
      outcomeTargets: "Nắm vững đại số",
      masterSyllabus: "https://syllabus.example/math10",
      exerciseBankRef: "EX-M10",
      examBankRef: "EXAM-M10",
    });
  });

  it("sends null (clear) for a blank code and blank counts", () => {
    const patch = toPatchInput({
      ...toFormValues(subject),
      code: "   ",
      periodCount: "",
      assessCount: "",
    });
    expect(patch.code).toBeNull();
    expect(patch.periodCount).toBeNull();
    expect(patch.requiredAssessmentCount).toBeNull();
  });

  it("trims a padded code before sending it", () => {
    const patch = toPatchInput({ ...toFormValues(subject), code: " MATH10 " });
    expect(patch.code).toBe("MATH10");
  });
});
