import { describe, expect, it } from "vitest";
import type {
  TermRecord,
  TermStatus,
} from "../entities/academic-record.entity";
import { deriveYearSealStatus } from "./derive-year-seal-status";

function term(status: TermStatus): TermRecord {
  return {
    termId: "HK1",
    status,
    classId: null,
    conductGrade: null,
    sealedAt: null,
    sealedBy: null,
    unsealedAt: null,
    unsealReason: null,
    subjects: [],
    gpa: null,
  };
}

describe("deriveYearSealStatus", () => {
  it("returns 'all_sealed' when every term is SEALED", () => {
    expect(deriveYearSealStatus([term("SEALED"), term("SEALED")])).toBe(
      "all_sealed",
    );
  });

  it("returns 'unsealed_in_year' when any term is UNSEALED", () => {
    expect(deriveYearSealStatus([term("SEALED"), term("UNSEALED")])).toBe(
      "unsealed_in_year",
    );
  });

  it("returns 'none' when no term is SEALED", () => {
    expect(deriveYearSealStatus([term("PENDING"), term("PENDING")])).toBe(
      "none",
    );
  });

  it("returns 'partial' when some but not all are SEALED", () => {
    expect(deriveYearSealStatus([term("SEALED"), term("PENDING")])).toBe(
      "partial",
    );
  });

  it("returns 'none' for an empty term list", () => {
    expect(deriveYearSealStatus([])).toBe("none");
  });
});
