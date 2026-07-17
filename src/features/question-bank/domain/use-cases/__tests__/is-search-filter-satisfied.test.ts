import { describe, expect, it } from "vitest";
import {
  ALL_SUBJECTS,
  isSearchFilterSatisfied,
} from "../is-search-filter-satisfied";

describe("isSearchFilterSatisfied (FR-002/FR-003 gate predicate)", () => {
  it.each([
    // subjectId, tag, expected
    ["", "", false], // nothing set
    [ALL_SUBJECTS, "", false], // "all" sentinel is NOT a real subject
    [ALL_SUBJECTS, "   ", false], // whitespace-only tag does not satisfy
    ["sub-math", "", true], // a real subject satisfies
    [ALL_SUBJECTS, "toán", true], // a non-empty tag satisfies
    ["sub-math", "toán", true], // both satisfy
    ["", "  toán  ", true], // trimmed non-empty tag satisfies
  ] as const)("subjectId=%p tag=%p → %p", (subjectId, tag, expected) => {
    expect(isSearchFilterSatisfied(subjectId, tag)).toBe(expected);
  });
});
