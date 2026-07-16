import { describe, expect, it } from "vitest";
import type { ClassSubjectTermKey } from "../../../domain/entities/class-subject-term-key.entity";
import { MockGradesRepository } from "./grades.mock.repository";

const key: ClassSubjectTermKey = {
  classId: "class-001",
  subjectId: "subj-toan-10",
  termId: "HK1",
  academicYearLabel: "2025-2026",
};

describe("MockGradesRepository", () => {
  it("getGradeSheet returns the seeded rows keyed by the requested identity", async () => {
    const repo = new MockGradesRepository();
    const sheet = await repo.getGradeSheet(key);
    expect(sheet.rows).toHaveLength(3);
    expect(sheet.classId).toBe("class-001");
    expect(sheet.subjectId).toBe("subj-toan-10");
    expect(sheet.termId).toBe("HK1");
    expect(sheet.academicYearLabel).toBe("2025-2026");
    expect(sheet.scheme.columns).toHaveLength(3);
  });

  it("saveScore updates the target cell's value (status stays DRAFT)", async () => {
    const repo = new MockGradesRepository();
    const result = await repo.saveScore(key, "hs-002", "ck", 8);
    expect(result.cell).toEqual({ value: 8, status: "DRAFT" });
  });

  it("saveScore recomputes the row average", async () => {
    const repo = new MockGradesRepository();
    // hs-002 starts with ck=null → average null; fill ck → average computed.
    await repo.saveScore(key, "hs-002", "ck", 6);
    const sheet = await repo.getGradeSheet(key);
    const row = sheet.rows.find((r) => r.studentId === "hs-002");
    // tx=4(20) gk=5(30) ck=6(50) = 80+150+300 = 530/100 = 5.3
    expect(row?.average).toBe(5.3);
  });

  it("submitScore transitions ONE cell to PUBLISHED in SELF_PUBLISH mode", async () => {
    const repo = new MockGradesRepository("SELF_PUBLISH");
    const result = await repo.submitScore(key, "hs-001", "tx");
    expect(result.cell.status).toBe("PUBLISHED");
    const sheet = await repo.getGradeSheet(key);
    const row = sheet.rows.find((r) => r.studentId === "hs-001");
    expect(row?.scores.tx.status).toBe("PUBLISHED");
    // Other cells on the same row are untouched — no bulk transition.
    expect(row?.scores.gk.status).toBe("DRAFT");
  });

  it("submitScore transitions to PENDING_APPROVAL in ADMIN_APPROVAL mode", async () => {
    const repo = new MockGradesRepository("ADMIN_APPROVAL");
    const result = await repo.submitScore(key, "hs-001", "tx");
    expect(result.cell.status).toBe("PENDING_APPROVAL");
  });

  it("submitScore on an already-submitted cell throws not-draft", async () => {
    const repo = new MockGradesRepository("SELF_PUBLISH");
    await repo.submitScore(key, "hs-001", "tx");
    await expect(repo.submitScore(key, "hs-001", "tx")).rejects.toEqual({
      type: "not-draft",
    });
  });

  it("saveScore on a non-DRAFT cell throws not-draft", async () => {
    const repo = new MockGradesRepository("SELF_PUBLISH");
    await repo.submitScore(key, "hs-001", "tx");
    await expect(repo.saveScore(key, "hs-001", "tx", 5)).rejects.toEqual({
      type: "not-draft",
    });
  });

  it("lockTerm bulk-locks every PUBLISHED cell and returns the count", async () => {
    const repo = new MockGradesRepository("SELF_PUBLISH");
    await repo.submitScore(key, "hs-001", "tx");
    await repo.submitScore(key, "hs-001", "gk");
    const result = await repo.lockTerm(key);
    expect(result.lockedCount).toBe(2);
    const sheet = await repo.getGradeSheet(key);
    const row = sheet.rows.find((r) => r.studentId === "hs-001");
    expect(row?.scores.tx.status).toBe("LOCKED");
    expect(row?.scores.gk.status).toBe("LOCKED");
  });
});
