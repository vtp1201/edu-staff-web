import { describe, expect, it } from "vitest";
import { SECTION_MAX_LENGTH } from "../../entities/lesson-plan.entity";
import { sectionLengthViolations } from "../validate-lesson-plan";

/**
 * Client-only section-length guard (FR-002 AC-002.3). Mirrors the title/tag
 * length boundary tests in `create-lesson-plan.use-case.test.ts`, but at the
 * pure-helper layer — no `LessonPlanFailure` variant exists for section length
 * (the BE has no error code), so it is asserted directly, not via the use-case.
 */
describe("sectionLengthViolations", () => {
  it("returns [] when every section is within its limit", () => {
    expect(
      sectionLengthViolations({
        objectives: "x".repeat(SECTION_MAX_LENGTH.objectives),
        contentOutline: "x".repeat(SECTION_MAX_LENGTH.contentOutline),
        activities: "x".repeat(SECTION_MAX_LENGTH.activities),
        assessmentMethod: "x".repeat(SECTION_MAX_LENGTH.assessmentMethod),
      }),
    ).toEqual([]);
  });

  it("returns [] for an empty/undefined draft", () => {
    expect(sectionLengthViolations({})).toEqual([]);
    expect(
      sectionLengthViolations({ objectives: "", contentOutline: "short" }),
    ).toEqual([]);
  });

  it("flags objectives over 5000 chars", () => {
    expect(sectionLengthViolations({ objectives: "x".repeat(5001) })).toEqual([
      "objectives",
    ]);
  });

  it("flags assessmentMethod over 5000 chars", () => {
    expect(
      sectionLengthViolations({ assessmentMethod: "x".repeat(5001) }),
    ).toEqual(["assessmentMethod"]);
  });

  it("flags contentOutline over 20000 chars", () => {
    expect(
      sectionLengthViolations({ contentOutline: "x".repeat(20001) }),
    ).toEqual(["contentOutline"]);
  });

  it("flags activities over 20000 chars", () => {
    expect(sectionLengthViolations({ activities: "x".repeat(20001) })).toEqual([
      "activities",
    ]);
  });

  it("allows a 20000-char body in the long sections but flags it in the short ones", () => {
    // Exactly the long-section limit — content/activities pass, but the same
    // length pasted into a short (5000) section is over the limit.
    expect(
      sectionLengthViolations({
        contentOutline: "x".repeat(20000),
        objectives: "x".repeat(20000),
      }),
    ).toEqual(["objectives"]);
  });

  it("returns every violating section key, in canonical order", () => {
    expect(
      sectionLengthViolations({
        objectives: "x".repeat(5001),
        contentOutline: "x".repeat(20001),
        activities: "ok",
        assessmentMethod: "x".repeat(5001),
      }),
    ).toEqual(["objectives", "contentOutline", "assessmentMethod"]);
  });
});
