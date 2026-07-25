import { describe, expect, it } from "vitest";
import {
  isRetryableStudentAbsenceFailure,
  type StudentAbsenceFailureType,
  toStudentAbsenceFailureType,
} from "./student-absence.failure";

const ALL: StudentAbsenceFailureType[] = [
  "forbidden",
  "not-found",
  "duplicate-date",
  "invalid-date",
  "invalid-state",
  "invalid-id",
  "invalid-input",
  "network-error",
];

describe("toStudentAbsenceFailureType", () => {
  it("recognises every one of the 8 union members", () => {
    for (const type of ALL) {
      expect(toStudentAbsenceFailureType({ type })).toBe(type);
    }
  });

  it("branches on the CODE, never on a human message (api-integration rule)", () => {
    // A message that talks about a future date must NOT be mapped to
    // invalid-date — only the code decides.
    expect(
      toStudentAbsenceFailureType({
        message: "Không thể chọn ngày trong tương lai.",
      }),
    ).toBe("network-error");
    expect(
      toStudentAbsenceFailureType({ type: "forbidden", message: "not found" }),
    ).toBe("forbidden");
  });

  it("falls back to network-error for unknown / non-object throws", () => {
    expect(toStudentAbsenceFailureType({ type: "locked" })).toBe(
      "network-error",
    );
    expect(toStudentAbsenceFailureType(new Error("boom"))).toBe(
      "network-error",
    );
    expect(toStudentAbsenceFailureType(undefined)).toBe("network-error");
    expect(toStudentAbsenceFailureType("forbidden")).toBe("network-error");
  });
});

describe("isRetryableStudentAbsenceFailure", () => {
  it("marks ONLY network-error retryable", () => {
    for (const type of ALL) {
      expect(isRetryableStudentAbsenceFailure(type)).toBe(
        type === "network-error",
      );
    }
  });
});
