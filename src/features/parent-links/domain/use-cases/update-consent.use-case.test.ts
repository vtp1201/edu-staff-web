import { describe, expect, it, vi } from "vitest";
import type { ParentStudentConsent } from "../entities/parent-student-consent.entity";
import type { ParentConsentFailure } from "../failures/parent-consent.failure";
import type { IParentConsentRepository } from "../repositories/i-parent-consent.repository";
import { fail, ok } from "./result";
import { UpdateConsentUseCase } from "./update-consent.use-case";

function makeRepo(
  overrides: Partial<IParentConsentRepository> = {},
): IParentConsentRepository {
  return {
    getLinkedStudents: vi.fn(),
    getConsents: vi.fn(),
    updateConsent: vi.fn(),
    ...overrides,
  };
}

const updated: ParentStudentConsent = {
  studentId: "st1",
  parentId: "self",
  disciplineAlerts: false,
  absenceAlerts: false,
  gradeAlerts: true,
};

describe("UpdateConsentUseCase", () => {
  it("passes the exact single-category input through and returns the echoed consent", async () => {
    const updateConsent = vi.fn().mockResolvedValue(ok(updated));
    const uc = new UpdateConsentUseCase(makeRepo({ updateConsent }));

    const res = await uc.execute({
      studentId: "st1",
      category: "grades",
      enabled: true,
    });

    expect(res).toEqual(ok(updated));
    // Single-scope invariant (AC-004.2): repo called with exactly the input.
    expect(updateConsent).toHaveBeenCalledWith({
      studentId: "st1",
      category: "grades",
      enabled: true,
    });
    expect(updateConsent).toHaveBeenCalledTimes(1);
  });

  const failures: ParentConsentFailure[] = [
    { type: "validation", fields: [{ field: "grades", message: "bad" }] },
    { type: "forbidden" },
    { type: "network-error" },
  ];
  it.each(failures)("propagates the %s failure unchanged", async (failure) => {
    const updateConsent = vi.fn().mockResolvedValue(fail(failure));
    const uc = new UpdateConsentUseCase(makeRepo({ updateConsent }));

    const res = await uc.execute({
      studentId: "st1",
      category: "discipline",
      enabled: false,
    });

    expect(res).toEqual(fail(failure));
  });
});
