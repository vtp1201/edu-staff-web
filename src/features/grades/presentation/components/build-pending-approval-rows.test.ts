import { describe, expect, it } from "vitest";
import type { PendingApprovalBatch } from "../../domain/entities/pending-approval-batch.entity";
import type { ClassSubjectOption } from "../grade-entry-screen/grade-entry-screen.i-vm";
import { buildPendingApprovalRows } from "./build-pending-approval-rows";

const OPTIONS: ClassSubjectOption[] = [
  {
    classId: "class-001",
    subjectId: "subj-toan-10",
    className: "10A1",
    subjectName: "Toán",
  },
];

const BATCH: PendingApprovalBatch = {
  classId: "class-001",
  subjectId: "subj-toan-10",
  termId: "HK1",
  pendingCount: 12,
  submittedAt: "2026-08-01T02:00:00Z",
};

describe("buildPendingApprovalRows", () => {
  it("resolves display labels from the picker options", () => {
    expect(buildPendingApprovalRows([BATCH], OPTIONS)).toEqual([
      {
        key: "class-001|subj-toan-10|HK1",
        classId: "class-001",
        subjectId: "subj-toan-10",
        termId: "HK1",
        classLabel: "10A1",
        subjectLabel: "Toán",
        pendingCount: 12,
        submittedAt: "2026-08-01T02:00:00Z",
      },
    ]);
  });

  /**
   * The rollup is TENANT-WIDE while the picker is composed from the classes the
   * caller can list — a batch the picker doesn't cover must still be shown (and
   * still be clickable), falling back to raw ids rather than rendering a blank
   * row or being dropped.
   */
  it("falls back to raw ids for a batch the picker does not cover", () => {
    const rows = buildPendingApprovalRows(
      [{ ...BATCH, classId: "class-999", subjectId: "subj-999" }],
      OPTIONS,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].classLabel).toBe("class-999");
    expect(rows[0].subjectLabel).toBe("subj-999");
  });

  it("keys each row by the full class-subject-term tuple", () => {
    const rows = buildPendingApprovalRows(
      [BATCH, { ...BATCH, termId: "HK2" }],
      OPTIONS,
    );
    expect(new Set(rows.map((r) => r.key)).size).toBe(2);
  });

  it("preserves the server's oldest-first order (no client re-sort)", () => {
    const older = { ...BATCH, termId: "HK1" };
    const newer = {
      ...BATCH,
      termId: "HK2",
      submittedAt: "2026-08-05T02:00:00Z",
    };
    expect(
      buildPendingApprovalRows([older, newer], OPTIONS).map((r) => r.termId),
    ).toEqual(["HK1", "HK2"]);
  });
});
