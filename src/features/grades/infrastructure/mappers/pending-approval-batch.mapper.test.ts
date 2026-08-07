import { describe, expect, it } from "vitest";
import type { PendingApprovalBatchResponseDto } from "../dtos/pending-approval-batch-response.dto";
import { mapPendingApprovalBatch } from "./pending-approval-batch.mapper";

const DTO: PendingApprovalBatchResponseDto = {
  classId: "class-1",
  subjectId: "subj-1",
  termId: "HK1",
  pendingCount: 12,
  submittedAt: "2026-08-01T02:00:00Z",
};

describe("mapPendingApprovalBatch", () => {
  it("maps every wire field 1:1 (no renames, camelCase both sides)", () => {
    expect(mapPendingApprovalBatch(DTO)).toEqual({
      classId: "class-1",
      subjectId: "subj-1",
      termId: "HK1",
      pendingCount: 12,
      submittedAt: "2026-08-01T02:00:00Z",
    });
  });

  /**
   * The rollup response carries NO per-entry ids and NO `batchId` (US-186's
   * openapi is explicit that drilling in is a separate gradebook GET). Asserting
   * the exact key set stops a future edit from quietly re-introducing the
   * fictional `batchId` the permanently-mocked batch dashboard invented.
   */
  it("produces exactly the five contract fields — no invented batchId", () => {
    expect(Object.keys(mapPendingApprovalBatch(DTO)).sort()).toEqual([
      "classId",
      "pendingCount",
      "subjectId",
      "submittedAt",
      "termId",
    ]);
  });
});
