import { beforeEach, describe, expect, it, vi } from "vitest";

const executeGet = vi.fn();
const executeUpdate = vi.fn();

vi.mock("@/bootstrap/di/parent-consent.di", () => ({
  makeGetLinkedStudentsWithConsentsUseCase: async () => ({
    execute: executeGet,
  }),
  makeUpdateConsentUseCase: async () => ({ execute: executeUpdate }),
}));

import {
  fetchParentConsentAction,
  updateParentConsentAction,
} from "./consent-actions";

beforeEach(() => {
  executeGet.mockReset();
  executeUpdate.mockReset();
});

describe("fetchParentConsentAction", () => {
  it("maps ok → success children, consent shape flattened, missing → null (pending)", async () => {
    executeGet.mockResolvedValue({
      ok: true,
      value: {
        students: [
          { studentId: "st1", fullName: "Khoa", avatarUrl: "u", linkId: "l1" },
          { studentId: "st2", fullName: "Bảo", linkId: "l2" },
        ],
        consentByStudentId: {
          st1: {
            studentId: "st1",
            parentId: "self",
            disciplineAlerts: true,
            absenceAlerts: false,
            gradeAlerts: true,
          },
        },
      },
    });

    const res = await fetchParentConsentAction();

    expect(res).toEqual({
      success: true,
      children: [
        {
          studentId: "st1",
          fullName: "Khoa",
          avatarUrl: "u",
          consent: { discipline: true, absence: false, grades: true },
        },
        {
          studentId: "st2",
          fullName: "Bảo",
          avatarUrl: undefined,
          consent: null,
        },
      ],
    });
  });

  it("maps forbidden failure → errorKey forbidden (distinct from empty, AC-002.2)", async () => {
    executeGet.mockResolvedValue({ ok: false, failure: { type: "forbidden" } });
    expect(await fetchParentConsentAction()).toEqual({
      success: false,
      errorKey: "forbidden",
    });
  });

  it("maps network-error failure → errorKey network-error", async () => {
    executeGet.mockResolvedValue({
      ok: false,
      failure: { type: "network-error" },
    });
    expect(await fetchParentConsentAction()).toEqual({
      success: false,
      errorKey: "network-error",
    });
  });

  it("never leaks a translated string (errorKey is a stable failure key)", async () => {
    executeGet.mockResolvedValue({ ok: false, failure: { type: "forbidden" } });
    const res = await fetchParentConsentAction();
    if (res.success) throw new Error("expected failure");
    expect(res.errorKey).toBe("forbidden");
  });
});

describe("updateParentConsentAction", () => {
  it("maps ok → success with flattened consent shape", async () => {
    executeUpdate.mockResolvedValue({
      ok: true,
      value: {
        studentId: "st1",
        parentId: "self",
        disciplineAlerts: false,
        absenceAlerts: true,
        gradeAlerts: false,
      },
    });

    const res = await updateParentConsentAction({
      studentId: "st1",
      category: "absence",
      enabled: true,
    });

    expect(res).toEqual({
      success: true,
      consent: { discipline: false, absence: true, grades: false },
    });
    expect(executeUpdate).toHaveBeenCalledWith({
      studentId: "st1",
      category: "absence",
      enabled: true,
    });
  });

  it.each([
    "validation",
    "forbidden",
    "network-error",
  ] as const)("maps %s failure → the same stable errorKey", async (type) => {
    executeUpdate.mockResolvedValue({
      ok: false,
      failure: type === "validation" ? { type, fields: [] } : { type },
    });
    const res = await updateParentConsentAction({
      studentId: "st1",
      category: "grades",
      enabled: true,
    });
    expect(res).toEqual({ success: false, errorKey: type });
  });
});
