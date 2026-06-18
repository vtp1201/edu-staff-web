import type { StatusFilter } from "./grade-approval-screen.i-vm";

export const gradeApprovalKeys = {
  all: ["grade-approval"] as const,
  batches: (statusFilter: StatusFilter) =>
    ["grade-approval-batches", statusFilter] as const,
  batchDetail: (batchId: string | null) =>
    ["grade-approval-batch-detail", batchId] as const,
};
