import { describe, expect, it } from "vitest";
import { MockGradesRepository } from "./grades.mock.repository";

describe("MockGradesRepository", () => {
  it("getGradeSheet returns the seeded rows", async () => {
    const repo = new MockGradesRepository();
    const sheet = await repo.getGradeSheet("cs-001", "HK1");
    expect(sheet.rows).toHaveLength(3);
    expect(sheet.classSubjectId).toBe("cs-001");
    expect(sheet.scheme.columns).toHaveLength(3);
  });

  it("saveScore updates the target row's score", async () => {
    const repo = new MockGradesRepository();
    const row = await repo.saveScore("cs-001", "hs-002", "ck", 8);
    expect(row.scores.ck).toBe(8);
  });

  it("saveScore recomputes the row average", async () => {
    const repo = new MockGradesRepository();
    // hs-002 starts with ck=null → average null; fill ck → average computed.
    const row = await repo.saveScore("cs-001", "hs-002", "ck", 6);
    // tx=4(20) gk=5(30) ck=6(50) = 80+150+300 = 530/100 = 5.3
    expect(row.average).toBe(5.3);
  });

  it("publishGrades sets all rows to PUBLISHED in SELF_PUBLISH mode", async () => {
    const repo = new MockGradesRepository("SELF_PUBLISH");
    await repo.publishGrades("cs-001", "HK1");
    const sheet = await repo.getGradeSheet("cs-001", "HK1");
    expect(sheet.rows.every((r) => r.publishStatus === "PUBLISHED")).toBe(true);
  });

  it("publishGrades sets PENDING_APPROVAL in ADMIN_APPROVAL mode", async () => {
    const repo = new MockGradesRepository("ADMIN_APPROVAL");
    await repo.publishGrades("cs-001", "HK1");
    const sheet = await repo.getGradeSheet("cs-001", "HK1");
    expect(
      sheet.rows.every((r) => r.publishStatus === "PENDING_APPROVAL"),
    ).toBe(true);
  });

  it("saveScore after publish throws already-published", async () => {
    const repo = new MockGradesRepository("SELF_PUBLISH");
    await repo.publishGrades("cs-001", "HK1");
    await expect(repo.saveScore("cs-001", "hs-001", "tx", 5)).rejects.toEqual({
      type: "already-published",
    });
  });
});
