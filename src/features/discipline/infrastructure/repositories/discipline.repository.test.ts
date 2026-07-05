/**
 * Integration tests — discipline repositories (US-E09.1).
 * MockDisciplineRepository: in-memory CRUD scenarios (mock-first, core service
 * not shipped). DisciplineRepository: assert ApiError code → DisciplineFailure
 * mapping (branch on code, never message).
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { RecordViolationInput } from "../../domain/entities/violation.entity";
import { DisciplineRepository, toFailure } from "./discipline.repository";
import { MockDisciplineRepository } from "./mocks/discipline.mock.repository";

const recordInput: RecordViolationInput = {
  studentName: "Nguyễn Văn Test",
  classId: "11B2",
  date: "2026-05-01",
  type: "late",
  severity: "low",
  period: 2,
  description: "Đi học muộn",
  notifyParent: false,
};

describe("MockDisciplineRepository", () => {
  it("getViolations returns the seeded list", async () => {
    const repo = new MockDisciplineRepository();
    const violations = await repo.getViolations({});
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toHaveProperty("severity");
  });

  it("recordViolation prepends a new violation", async () => {
    const repo = new MockDisciplineRepository();
    const before = await repo.getViolations({});
    const created = await repo.recordViolation(recordInput);
    expect(created.studentName).toBe("Nguyễn Văn Test");
    const after = await repo.getViolations({});
    expect(after.length).toBe(before.length + 1);
    expect(after[0].id).toBe(created.id);
  });

  it("deleteViolation removes the violation from the list", async () => {
    const repo = new MockDisciplineRepository();
    const created = await repo.recordViolation(recordInput);
    const before = await repo.getViolations({});
    await repo.deleteViolation(created.id);
    const after = await repo.getViolations({});
    expect(after.length).toBe(before.length - 1);
    expect(after.some((v) => v.id === created.id)).toBe(false);
  });

  it("approveLeave moves a pending request to approved", async () => {
    const repo = new MockDisciplineRepository();
    const updated = await repo.approveLeave("l-1");
    expect(updated.status).toBe("approved");
    expect(updated.approvedBy).toBeTruthy();
  });

  it("rejectLeave moves a pending request to rejected with reason", async () => {
    const repo = new MockDisciplineRepository();
    const updated = await repo.rejectLeave("l-4", "Lý do từ chối hợp lệ");
    expect(updated.status).toBe("rejected");
    expect(updated.rejectionReason).toBe("Lý do từ chối hợp lệ");
  });

  it("approveLeave throws already-processed for a non-pending request", async () => {
    const repo = new MockDisciplineRepository();
    // l-2 is already approved in fixtures.
    await expect(repo.approveLeave("l-2")).rejects.toMatchObject({
      type: "already-processed",
    });
  });

  it("overrideConductGrade updates grade + flags override", async () => {
    const repo = new MockDisciplineRepository();
    const updated = await repo.overrideConductGrade(
      "s-2",
      "good",
      "Đã có tiến bộ",
    );
    expect(updated.grade).toBe("good");
    expect(updated.isOverridden).toBe(true);
    expect(updated.overrideNote).toBe("Đã có tiến bộ");
  });

  // --- Student / parent self-service (US-E09.2) ---

  it("getMyConductSummary returns the student's own summary", async () => {
    const repo = new MockDisciplineRepository();
    const summary = await repo.getMyConductSummary("s-1", "HK1");
    expect(summary.studentId).toBe("s-1");
    expect(summary.grade).toBe("good");
  });

  it("getMyConductSummary falls back for an unknown student", async () => {
    const repo = new MockDisciplineRepository();
    const summary = await repo.getMyConductSummary("s-unknown");
    expect(summary).toHaveProperty("points");
    expect(summary).toHaveProperty("grade");
  });

  it("getMyViolations only returns the student's own violations", async () => {
    const repo = new MockDisciplineRepository();
    const violations = await repo.getMyViolations("s-1");
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.every((v) => v.studentId === "s-1")).toBe(true);
  });

  it("getMyLeaveRequests only returns the student's own requests", async () => {
    const repo = new MockDisciplineRepository();
    const leave = await repo.getMyLeaveRequests("s-1");
    expect(leave.length).toBeGreaterThan(0);
    expect(leave.every((l) => l.studentId === "s-1")).toBe(true);
  });

  it("submitLeaveRequest prepends a pending request to the student's history", async () => {
    const repo = new MockDisciplineRepository();
    const before = await repo.getMyLeaveRequests("s-1");
    const created = await repo.submitLeaveRequest({
      studentId: "s-1",
      startDate: "2026-06-20",
      endDate: "2026-06-21",
      type: "medical",
      reason: "Khám sức khỏe định kỳ tại bệnh viện",
      submittedBy: "student",
    });
    expect(created.status).toBe("pending");
    expect(created.dayCount).toBe(2);
    expect(created.startDate).toBe("20/06/2026");
    const after = await repo.getMyLeaveRequests("s-1");
    expect(after.length).toBe(before.length + 1);
    expect(after[0].id).toBe(created.id);
  });
});

describe("MockDisciplineRepository (parent multi-child, US-E09.4)", () => {
  it("getChildren returns the linked children", async () => {
    const repo = new MockDisciplineRepository();
    const children = await repo.getChildren();
    expect(children).toHaveLength(2);
    expect(children[0].childId).toBe("c1");
    expect(children[1].childId).toBe("c2");
  });

  it("getChildConductSummary returns the per-child summary", async () => {
    const repo = new MockDisciplineRepository();
    const c1 = await repo.getChildConductSummary("c1");
    expect(c1.points).toBe(82);
    expect(c1.grade).toBe("good");
    const c2 = await repo.getChildConductSummary("c2");
    expect(c2.points).toBe(94);
    expect(c2.grade).toBe("excellent");
  });

  it("getChildConductSummary throws not-found for an unknown child", async () => {
    const repo = new MockDisciplineRepository();
    await expect(repo.getChildConductSummary("c9")).rejects.toMatchObject({
      type: "not-found",
    });
  });

  it("getChildViolations returns child-specific violations (c1 has 2, c2 none)", async () => {
    const repo = new MockDisciplineRepository();
    expect(await repo.getChildViolations("c1")).toHaveLength(2);
    expect(await repo.getChildViolations("c2")).toHaveLength(0);
  });

  it("getChildLeaveRequests returns child-specific history with a rejected entry for c2", async () => {
    const repo = new MockDisciplineRepository();
    const c2 = await repo.getChildLeaveRequests("c2");
    expect(c2.some((l) => l.status === "rejected" && l.rejectionReason)).toBe(
      true,
    );
  });

  it("submitLeaveForChild prepends a pending entry to the child's history", async () => {
    const repo = new MockDisciplineRepository();
    const before = await repo.getChildLeaveRequests("c1");
    const created = await repo.submitLeaveForChild("c1", {
      startDate: "2026-06-20",
      endDate: "2026-06-21",
      type: "medical",
      reason: "Khám bệnh định kỳ tại bệnh viện",
    });
    expect(created.status).toBe("pending");
    expect(created.dayCount).toBe(2);
    const after = await repo.getChildLeaveRequests("c1");
    expect(after.length).toBe(before.length + 1);
    expect(after[0].id).toBe(created.id);
  });

  it("submitLeaveForChild throws not-found for an unknown child", async () => {
    const repo = new MockDisciplineRepository();
    await expect(
      repo.submitLeaveForChild("c9", {
        startDate: "2026-06-20",
        endDate: "2026-06-20",
        type: "medical",
        reason: "Khám bệnh định kỳ tại bệnh viện",
      }),
    ).rejects.toMatchObject({ type: "not-found" });
  });
});

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

describe("DisciplineRepository (real) error mapping", () => {
  it("maps NETWORK_ERROR to network-error", () => {
    expect(
      toFailure(
        new ApiError({
          code: "NETWORK_ERROR",
          message: "x",
          retryable: true,
          status: 0,
        }),
      ),
    ).toEqual({ type: "network-error" });
  });

  it("maps 409 / LEAVE_ALREADY_DECIDED to already-processed", () => {
    expect(
      toFailure(
        new ApiError({
          code: "LEAVE_ALREADY_DECIDED",
          message: "x",
          retryable: false,
          status: 409,
        }),
      ),
    ).toEqual({ type: "already-processed" });
  });

  it("approveLeave throws mapped failure on API error", async () => {
    const put = vi.fn().mockRejectedValue(
      new ApiError({
        code: "LEAVE_ALREADY_DECIDED",
        message: "x",
        retryable: false,
        status: 409,
      }),
    );
    const repo = new DisciplineRepository(makeHttp({ put }));
    await expect(repo.approveLeave("l-1")).rejects.toMatchObject({
      type: "already-processed",
    });
  });
});
