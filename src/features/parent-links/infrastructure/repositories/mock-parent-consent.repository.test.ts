import { describe, expect, it } from "vitest";
import {
  CONSENT_FAIL_STUDENT_ID,
  MockParentConsentRepository,
} from "./mock-parent-consent.repository";

describe("MockParentConsentRepository", () => {
  it("default seed returns 3 linked students with matching consent rows", async () => {
    const repo = new MockParentConsentRepository();

    const students = await repo.getLinkedStudents();
    expect(students.ok).toBe(true);
    if (!students.ok) return;
    expect(students.value).toHaveLength(3);

    const ids = students.value.map((s) => s.studentId);
    const consents = await repo.getConsents(ids);
    expect(consents.ok).toBe(true);
    if (!consents.ok) return;
    // Every requested student has a consent row (typical case).
    expect(consents.value.map((c) => c.studentId).sort()).toEqual(
      [...ids].sort(),
    );
  });

  it("seeds a mix of all-on / all-off / partial consent", async () => {
    const repo = new MockParentConsentRepository();
    const students = await repo.getLinkedStudents();
    if (!students.ok) return;
    const consents = await repo.getConsents(
      students.value.map((s) => s.studentId),
    );
    if (!consents.ok) return;

    const allOn = consents.value.some(
      (c) => c.disciplineAlerts && c.absenceAlerts && c.gradeAlerts,
    );
    const allOff = consents.value.some(
      (c) => !c.disciplineAlerts && !c.absenceAlerts && !c.gradeAlerts,
    );
    const partial = consents.value.some((c) => {
      const vals = [c.disciplineAlerts, c.absenceAlerts, c.gradeAlerts];
      return vals.includes(true) && vals.includes(false);
    });
    expect(allOn).toBe(true);
    expect(allOff).toBe(true);
    expect(partial).toBe(true);
  });

  it("empty seed: getLinkedStudents returns ok([])", async () => {
    const repo = new MockParentConsentRepository({ students: [] });
    const res = await repo.getLinkedStudents();
    expect(res).toEqual({ ok: true, value: [] });
  });

  it("updateConsent echoes the new value for a normal student", async () => {
    const repo = new MockParentConsentRepository();
    const students = await repo.getLinkedStudents();
    if (!students.ok) return;
    const target = students.value[0].studentId;

    const res = await repo.updateConsent({
      studentId: target,
      category: "grades",
      enabled: false,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.studentId).toBe(target);
    expect(res.value.gradeAlerts).toBe(false);
  });

  it("updateConsent persists the change for the next getConsents read", async () => {
    const repo = new MockParentConsentRepository();
    const students = await repo.getLinkedStudents();
    if (!students.ok) return;
    const target = students.value[0].studentId;

    await repo.updateConsent({
      studentId: target,
      category: "discipline",
      enabled: false,
    });
    const consents = await repo.getConsents([target]);
    if (!consents.ok) return;
    expect(consents.value[0].disciplineAlerts).toBe(false);
  });

  it("updateConsent ALWAYS fails with validation for the fixed fail-student id (any category)", async () => {
    const repo = new MockParentConsentRepository();
    for (const category of ["discipline", "absence", "grades"] as const) {
      const res = await repo.updateConsent({
        studentId: CONSENT_FAIL_STUDENT_ID,
        category,
        enabled: true,
      });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.failure.type).toBe("validation");
    }
  });

  it("exposes no parentId argument on any public method (server-resolved only, NFR-007)", async () => {
    const repo = new MockParentConsentRepository();
    // Type-level guarantee is the real proof; assert the runtime methods take
    // the documented arities only (no parent id leaks in).
    expect(repo.getLinkedStudents.length).toBe(0);
    expect(repo.getConsents.length).toBe(1); // studentIds only
    expect(repo.updateConsent.length).toBe(1); // input object only
  });
});
