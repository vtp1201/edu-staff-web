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

describe("MockGradesRepository.rejectEntry — US-E18.44 (mirrors BE US-184)", () => {
  async function pending(repo: MockGradesRepository) {
    await repo.submitScore(key, "hs-001", "tx");
  }

  it("transitions a PENDING_APPROVAL cell back to DRAFT and records the rejection", async () => {
    const repo = new MockGradesRepository("ADMIN_APPROVAL");
    await pending(repo);

    const result = await repo.rejectEntry(
      key,
      "hs-001",
      "tx",
      "Sai điểm thường xuyên",
    );

    expect(result.cell.status).toBe("DRAFT");
    expect(result.cell.rejection?.reason).toBe("Sai điểm thường xuyên");
    expect(result.cell.rejection?.rejectedBy).toBeTruthy();
    expect(result.cell.rejection?.rejectedAt).toBeTruthy();
  });

  it("persists the rejection so a re-read of the sheet shows DRAFT + reason", async () => {
    const repo = new MockGradesRepository("ADMIN_APPROVAL");
    await pending(repo);
    await repo.rejectEntry(key, "hs-001", "tx", "Nhập lại điểm");

    const sheet = await repo.getGradeSheet(key);
    const row = sheet.rows.find((r) => r.studentId === "hs-001");
    expect(row?.scores.tx.status).toBe("DRAFT");
    expect(row?.scores.tx.rejection?.reason).toBe("Nhập lại điểm");
    // The score VALUE survives — the teacher edits it, they don't re-key it blind.
    expect(row?.scores.tx.value).toBe(8);
  });

  it("does NOT clear the rejection when the teacher resubmits (approver keeps seeing it)", async () => {
    const repo = new MockGradesRepository("ADMIN_APPROVAL");
    await pending(repo);
    await repo.rejectEntry(key, "hs-001", "tx", "Nhập lại điểm");

    await repo.saveScore(key, "hs-001", "tx", 9);
    const resubmitted = await repo.submitScore(key, "hs-001", "tx");

    expect(resubmitted.cell.status).toBe("PENDING_APPROVAL");
    expect(resubmitted.cell.rejection?.reason).toBe("Nhập lại điểm");
  });

  it("keeps only the LATEST rejection cycle", async () => {
    const repo = new MockGradesRepository("ADMIN_APPROVAL");
    await pending(repo);
    await repo.rejectEntry(key, "hs-001", "tx", "Lần 1");
    await repo.submitScore(key, "hs-001", "tx");
    await repo.rejectEntry(key, "hs-001", "tx", "Lần 2");

    const sheet = await repo.getGradeSheet(key);
    const row = sheet.rows.find((r) => r.studentId === "hs-001");
    expect(row?.scores.tx.rejection?.reason).toBe("Lần 2");
  });

  it("throws not-pending-approval for a cell that is not PENDING_APPROVAL", async () => {
    const repo = new MockGradesRepository("ADMIN_APPROVAL");
    await expect(
      repo.rejectEntry(key, "hs-001", "tx", "Sai điểm"),
    ).rejects.toEqual({ type: "not-pending-approval" });
  });

  it("throws rejection-reason-required for a blank reason (BE 422 parity)", async () => {
    const repo = new MockGradesRepository("ADMIN_APPROVAL");
    await pending(repo);
    await expect(repo.rejectEntry(key, "hs-001", "tx", "   ")).rejects.toEqual({
      type: "rejection-reason-required",
    });
  });

  it("throws not-found for an unknown student", async () => {
    const repo = new MockGradesRepository("ADMIN_APPROVAL");
    await expect(
      repo.rejectEntry(key, "hs-999", "tx", "Sai điểm"),
    ).rejects.toEqual({ type: "not-found" });
  });
});

describe("MockGradesRepository.approveEntry — US-E18.46", () => {
  async function pending(repo: MockGradesRepository) {
    await repo.submitScore(key, "hs-001", "tx");
  }

  it("transitions a PENDING_APPROVAL cell to PUBLISHED", async () => {
    const repo = new MockGradesRepository("ADMIN_APPROVAL");
    await pending(repo);

    const result = await repo.approveEntry(key, "hs-001", "tx");

    expect(result.cell.status).toBe("PUBLISHED");
    const sheet = await repo.getGradeSheet(key);
    expect(
      sheet.rows.find((r) => r.studentId === "hs-001")?.scores.tx.status,
    ).toBe("PUBLISHED");
  });

  /**
   * Unlike an edit/resubmit (where BE deliberately keeps the rejection so the
   * approver still sees why it came back), approval settles the objection.
   */
  it("drops a prior rejection payload once approved", async () => {
    const repo = new MockGradesRepository("ADMIN_APPROVAL");
    await pending(repo);
    await repo.rejectEntry(key, "hs-001", "tx", "Sai điểm");
    await repo.saveScore(key, "hs-001", "tx", 9);
    await repo.submitScore(key, "hs-001", "tx");

    const result = await repo.approveEntry(key, "hs-001", "tx");

    expect(result.cell.rejection).toBeUndefined();
  });

  it("throws not-pending-approval for a cell that is not PENDING_APPROVAL", async () => {
    const repo = new MockGradesRepository("ADMIN_APPROVAL");
    await expect(repo.approveEntry(key, "hs-001", "tx")).rejects.toEqual({
      type: "not-pending-approval",
    });
  });

  it("throws not-found for an unknown student", async () => {
    const repo = new MockGradesRepository("ADMIN_APPROVAL");
    await expect(repo.approveEntry(key, "hs-999", "tx")).rejects.toEqual({
      type: "not-found",
    });
  });
});
