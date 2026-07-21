import { describe, expect, it, vi } from "vitest";
import type { LinkedStudentSummary } from "../entities/linked-student-summary.entity";
import type { ParentStudentConsent } from "../entities/parent-student-consent.entity";
import type { IParentConsentRepository } from "../repositories/i-parent-consent.repository";
import { GetLinkedStudentsWithConsentsUseCase } from "./get-linked-students-with-consents.use-case";
import { fail, ok } from "./result";

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

const STUDENTS: LinkedStudentSummary[] = [
  { studentId: "st1", fullName: "Nguyễn Minh Khoa", linkId: "l1" },
  { studentId: "st2", fullName: "Trần Quốc Bảo", linkId: "l2" },
];

const consent = (studentId: string): ParentStudentConsent => ({
  studentId,
  parentId: "self",
  disciplineAlerts: true,
  absenceAlerts: false,
  gradeAlerts: true,
});

describe("GetLinkedStudentsWithConsentsUseCase", () => {
  it("typical: returns students + a consentByStudentId map keyed for each", async () => {
    const getLinkedStudents = vi.fn().mockResolvedValue(ok(STUDENTS));
    const getConsents = vi
      .fn()
      .mockResolvedValue(ok([consent("st1"), consent("st2")]));
    const uc = new GetLinkedStudentsWithConsentsUseCase(
      makeRepo({ getLinkedStudents, getConsents }),
    );

    const res = await uc.execute();

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.students).toEqual(STUDENTS);
    expect(res.value.consentByStudentId).toEqual({
      st1: consent("st1"),
      st2: consent("st2"),
    });
    expect(getConsents).toHaveBeenCalledWith(["st1", "st2"]);
  });

  it("empty: students ok [] → returns empty result WITHOUT calling getConsents", async () => {
    const getLinkedStudents = vi.fn().mockResolvedValue(ok([]));
    const getConsents = vi.fn();
    const uc = new GetLinkedStudentsWithConsentsUseCase(
      makeRepo({ getLinkedStudents, getConsents }),
    );

    const res = await uc.execute();

    expect(res).toEqual(ok({ students: [], consentByStudentId: {} }));
    expect(getConsents).not.toHaveBeenCalled();
  });

  it("students fail forbidden → propagates as-is, getConsents never called", async () => {
    const getLinkedStudents = vi
      .fn()
      .mockResolvedValue(fail({ type: "forbidden" }));
    const getConsents = vi.fn();
    const uc = new GetLinkedStudentsWithConsentsUseCase(
      makeRepo({ getLinkedStudents, getConsents }),
    );

    const res = await uc.execute();

    expect(res).toEqual(fail({ type: "forbidden" }));
    expect(getConsents).not.toHaveBeenCalled();
  });

  it("students ok + consents fail network-error → propagates the consents failure", async () => {
    const getLinkedStudents = vi.fn().mockResolvedValue(ok(STUDENTS));
    const getConsents = vi
      .fn()
      .mockResolvedValue(fail({ type: "network-error" }));
    const uc = new GetLinkedStudentsWithConsentsUseCase(
      makeRepo({ getLinkedStudents, getConsents }),
    );

    const res = await uc.execute();

    expect(res).toEqual(fail({ type: "network-error" }));
  });

  it("pending sub-state: a student with no matching consent row is ABSENT from the map (not a guessed default)", async () => {
    const getLinkedStudents = vi.fn().mockResolvedValue(ok(STUDENTS));
    // Only st1 resolved; st2's consent is missing.
    const getConsents = vi.fn().mockResolvedValue(ok([consent("st1")]));
    const uc = new GetLinkedStudentsWithConsentsUseCase(
      makeRepo({ getLinkedStudents, getConsents }),
    );

    const res = await uc.execute();

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.consentByStudentId.st1).toEqual(consent("st1"));
    expect("st2" in res.value.consentByStudentId).toBe(false);
  });
});
