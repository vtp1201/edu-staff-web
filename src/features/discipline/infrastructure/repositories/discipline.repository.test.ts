/**
 * Integration/unit tests — discipline repositories (US-E09.1, remapped US-E18.14).
 *
 * MockDisciplineRepository: in-memory CRUD scenarios (mock-first — the feature
 * is permanently mock-first, `discipline.di.ts` force-mocks regardless of
 * `USE_MOCK`). DisciplineRepository (real): `toFailure` is ground-truthed
 * against `edu-api/services/core/internal/conduct/**` and kept correct +
 * unit-tested for the day this unblocks; every method is a permanent blocked
 * stub that never calls `http.*` (two categorical blockers — no real roster
 * UUID lookup + no self-scope `classId` discovery — make every operation
 * unreachable; see the story packet and the class doc comment). Branch on
 * error.code, never on message.
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

/** Addressing tuple for a leave decision (US-E24.11). */
function decide(id: string, studentMemberId: string, classId: string) {
  return { id, studentMemberId, classId };
}

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
    const updated = await repo.approveLeave(decide("l-1", "s-30", "11A2"));
    expect(updated.status).toBe("approved");
    expect(updated.approvedBy).toBeTruthy();
  });

  it("rejectLeave moves a pending request to rejected with reason", async () => {
    const repo = new MockDisciplineRepository();
    const updated = await repo.rejectLeave({
      ...decide("l-4", "s-9", "10A1"),
      reason: "Lý do từ chối hợp lệ",
    });
    expect(updated.status).toBe("rejected");
    expect(updated.rejectionReason).toBe("Lý do từ chối hợp lệ");
  });

  it("approveLeave throws already-processed for a non-pending request", async () => {
    const repo = new MockDisciplineRepository();
    // l-2 is already approved in fixtures.
    await expect(
      repo.approveLeave(decide("l-2", "s-4", "11B2")),
    ).rejects.toMatchObject({ type: "already-processed" });
  });

  // decision 0063 — the mock repository is the DURABLE authorization boundary
  // while the rest of this feature stays mock-first: a forged scope must be
  // refused before any state change, not merely hidden by the UI.
  it("approveLeave refuses a forged authCtx (not the GVCN of that class) WITHOUT mutating", async () => {
    const repo = new MockDisciplineRepository();
    await expect(
      repo.approveLeave({
        ...decide("l-1", "s-30", "11A2"),
        authCtx: { role: "teacher", homeroomClassIds: ["some-other-class"] },
      }),
    ).rejects.toMatchObject({ type: "forbidden" });

    // Still pending — the denial happened before the fixture was touched.
    const after = await repo.getLeaveRequests({ classId: "11A2" });
    expect(after.find((l) => l.id === "l-1")?.status).toBe("pending");
  });

  it("rejectLeave refuses a non-teacher role even when the class id matches", async () => {
    const repo = new MockDisciplineRepository();
    await expect(
      repo.rejectLeave({
        ...decide("l-4", "s-9", "10A1"),
        authCtx: { role: "principal", homeroomClassIds: ["10A1"] },
        reason: "Lý do từ chối hợp lệ",
      }),
    ).rejects.toMatchObject({ type: "forbidden" });
  });

  it("accepts a matching GVCN authCtx", async () => {
    const repo = new MockDisciplineRepository();
    const updated = await repo.approveLeave({
      ...decide("l-1", "s-30", "11A2"),
      authCtx: { role: "teacher", homeroomClassIds: ["11A2", "x"] },
    });
    expect(updated.status).toBe("approved");
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
    patch: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

describe("toFailure — ground-truthed core conduct matrix (US-E18.14)", () => {
  it("maps NETWORK_ERROR (status 0) → network-error", () => {
    expect(toFailure(apiError("NETWORK_ERROR", 0)).type).toBe("network-error");
  });

  // --- student-violations ---
  it("maps VIOLATION_NOT_FOUND (404) → not-found", () => {
    expect(toFailure(apiError("VIOLATION_NOT_FOUND", 404)).type).toBe(
      "not-found",
    );
  });

  it("maps VIOLATION_FORBIDDEN (403) → forbidden", () => {
    expect(toFailure(apiError("VIOLATION_FORBIDDEN", 403)).type).toBe(
      "forbidden",
    );
  });

  it("maps VIOLATION_SAME_ACTOR (409, ADR 0073 distinct-actor) → same-actor", () => {
    expect(toFailure(apiError("VIOLATION_SAME_ACTOR", 409)).type).toBe(
      "same-actor",
    );
  });

  it("maps VIOLATION_INVALID_TRANSITION (409, shared state machine) → invalid-transition", () => {
    expect(toFailure(apiError("VIOLATION_INVALID_TRANSITION", 409)).type).toBe(
      "invalid-transition",
    );
  });

  it("maps VIOLATION_REJECTION_REASON_REQUIRED (422) → missing-reject-reason", () => {
    expect(
      toFailure(apiError("VIOLATION_REJECTION_REASON_REQUIRED", 422)).type,
    ).toBe("missing-reject-reason");
  });

  it("maps VIOLATION_INVALID_ID (400, malformed id → record unreachable) → not-found", () => {
    expect(toFailure(apiError("VIOLATION_INVALID_ID", 400)).type).toBe(
      "not-found",
    );
  });

  it("maps VIOLATION_INVALID_SEVERITY (422) → invalid-severity", () => {
    expect(toFailure(apiError("VIOLATION_INVALID_SEVERITY", 422)).type).toBe(
      "invalid-severity",
    );
  });

  it("maps VIOLATION_INVALID_STATE (400, state-machine backstop) → invalid-transition", () => {
    expect(toFailure(apiError("VIOLATION_INVALID_STATE", 400)).type).toBe(
      "invalid-transition",
    );
  });

  it("maps VIOLATION_INVALID_INPUT (422, create validation) → missing-description", () => {
    expect(toFailure(apiError("VIOLATION_INVALID_INPUT", 422)).type).toBe(
      "missing-description",
    );
  });

  // --- student-conduct-grades ---
  it("maps CONDUCT_GRADE_NOT_FOUND (404) → not-found", () => {
    expect(toFailure(apiError("CONDUCT_GRADE_NOT_FOUND", 404)).type).toBe(
      "not-found",
    );
  });

  it("maps CONDUCT_GRADE_FORBIDDEN (403) → forbidden", () => {
    expect(toFailure(apiError("CONDUCT_GRADE_FORBIDDEN", 403)).type).toBe(
      "forbidden",
    );
  });

  it("maps CONDUCT_GRADE_INVALID_GRADE (422) → invalid-conduct-grade", () => {
    expect(toFailure(apiError("CONDUCT_GRADE_INVALID_GRADE", 422)).type).toBe(
      "invalid-conduct-grade",
    );
  });

  it("maps CONDUCT_GRADE_LOCKED (409, ADR 0074 re-set after APPROVED) → locked", () => {
    expect(toFailure(apiError("CONDUCT_GRADE_LOCKED", 409)).type).toBe(
      "locked",
    );
  });

  it("maps CONDUCT_GRADE_TERM_NOT_FOUND (404) → not-found", () => {
    expect(toFailure(apiError("CONDUCT_GRADE_TERM_NOT_FOUND", 404)).type).toBe(
      "not-found",
    );
  });

  // --- student-leave-requests ---
  it("maps LEAVE_REQUEST_NOT_FOUND (404) → not-found", () => {
    expect(toFailure(apiError("LEAVE_REQUEST_NOT_FOUND", 404)).type).toBe(
      "not-found",
    );
  });

  it("maps LEAVE_REQUEST_FORBIDDEN (403) → forbidden", () => {
    expect(toFailure(apiError("LEAVE_REQUEST_FORBIDDEN", 403)).type).toBe(
      "forbidden",
    );
  });

  it("maps LEAVE_REQUEST_INVALID_DATE_RANGE (400) → invalid-date", () => {
    expect(
      toFailure(apiError("LEAVE_REQUEST_INVALID_DATE_RANGE", 400)).type,
    ).toBe("invalid-date");
  });

  it("maps LEAVE_REQUEST_INVALID_INPUT (400, reason validation) → reason-too-short", () => {
    expect(toFailure(apiError("LEAVE_REQUEST_INVALID_INPUT", 400)).type).toBe(
      "reason-too-short",
    );
  });

  it("maps LEAVE_REQUEST_STUDENT_NOT_ENROLLED (403, distinct business rule) → student-not-enrolled", () => {
    expect(
      toFailure(apiError("LEAVE_REQUEST_STUDENT_NOT_ENROLLED", 403)).type,
    ).toBe("student-not-enrolled");
  });

  // --- legacy generic fallbacks (pre-remap, kept for back-compat) ---
  it("still maps LEAVE_ALREADY_DECIDED (409) → already-processed", () => {
    expect(toFailure(apiError("LEAVE_ALREADY_DECIDED", 409)).type).toBe(
      "already-processed",
    );
  });

  it("falls back to network-error for an unrecognised code", () => {
    expect(toFailure(apiError("SOMETHING_UNKNOWN", 500)).type).toBe(
      "network-error",
    );
  });
});

describe("DisciplineRepository (real) — permanent blocked stubs (US-E18.14)", () => {
  // Every method is a permanent stub: it throws the documented blocked failure
  // WITHOUT ever calling `http.*`. The DI factory force-mocks regardless of
  // `USE_MOCK`, so these bodies are unreachable at runtime — tested here only to
  // guarantee they never silently hit the (unwireable) real API.
  it("getViolations throws without calling http.get", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http);
    await expect(repo.getViolations({})).rejects.toBeDefined();
    expect(http.get).not.toHaveBeenCalled();
  });

  it("recordViolation throws without calling http.post", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http);
    await expect(repo.recordViolation(recordInput)).rejects.toBeDefined();
    expect(http.post).not.toHaveBeenCalled();
  });

  it("deleteViolation throws without calling http.delete", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http);
    await expect(repo.deleteViolation("v-1")).rejects.toBeDefined();
    expect(http.delete).not.toHaveBeenCalled();
  });

  it("getConductSummary throws without calling http.get", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http);
    await expect(repo.getConductSummary({})).rejects.toBeDefined();
    expect(http.get).not.toHaveBeenCalled();
  });

  it("overrideConductGrade throws without calling http.put", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http);
    await expect(
      repo.overrideConductGrade("s-1", "good", "note"),
    ).rejects.toBeDefined();
    expect(http.put).not.toHaveBeenCalled();
  });

  it("getMyConductSummary throws without calling http.get", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http);
    await expect(repo.getMyConductSummary("s-1")).rejects.toBeDefined();
    expect(http.get).not.toHaveBeenCalled();
  });

  it("getMyViolations throws without calling http.get", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http);
    await expect(repo.getMyViolations("s-1")).rejects.toBeDefined();
    expect(http.get).not.toHaveBeenCalled();
  });

  it("getMyLeaveRequests throws without calling http.get", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http);
    await expect(repo.getMyLeaveRequests("s-1")).rejects.toBeDefined();
    expect(http.get).not.toHaveBeenCalled();
  });

  it("submitLeaveRequest throws without calling http.post", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http);
    await expect(
      repo.submitLeaveRequest({
        studentId: "s-1",
        startDate: "2026-06-20",
        endDate: "2026-06-21",
        type: "medical",
        reason: "Khám bệnh định kỳ tại bệnh viện",
        submittedBy: "student",
      }),
    ).rejects.toBeDefined();
    expect(http.post).not.toHaveBeenCalled();
  });

  it("getChildren throws without calling http.get", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http);
    await expect(repo.getChildren()).rejects.toBeDefined();
    expect(http.get).not.toHaveBeenCalled();
  });

  it("getChildConductSummary throws without calling http.get", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http);
    await expect(repo.getChildConductSummary("c1")).rejects.toBeDefined();
    expect(http.get).not.toHaveBeenCalled();
  });

  it("getChildViolations throws without calling http.get", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http);
    await expect(repo.getChildViolations("c1")).rejects.toBeDefined();
    expect(http.get).not.toHaveBeenCalled();
  });

  it("getChildLeaveRequests throws without calling http.get", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http);
    await expect(repo.getChildLeaveRequests("c1")).rejects.toBeDefined();
    expect(http.get).not.toHaveBeenCalled();
  });

  it("submitLeaveForChild throws without calling http.post", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http);
    await expect(
      repo.submitLeaveForChild("c1", {
        startDate: "2026-06-20",
        endDate: "2026-06-21",
        type: "medical",
        reason: "Khám bệnh định kỳ tại bệnh viện",
      }),
    ).rejects.toBeDefined();
    expect(http.post).not.toHaveBeenCalled();
  });
});

/**
 * US-E24.11 — the THREE methods that stopped being blocked stubs. Everything
 * else in this class is still permanently blocked (asserted above).
 */
describe("DisciplineRepository (real) — GVCN homeroom leave inbox (US-E24.11)", () => {
  const submitted = {
    requestId: "req-1",
    studentMemberId: "stu-1",
    classId: "cls-10a1",
    startDate: "2026-05-02",
    endDate: "2026-05-03",
    reason: "Khám bệnh định kỳ tại bệnh viện",
    state: "SUBMITTED" as const,
    submittedByMemberId: "par-1",
    createdAt: "2026-04-29T08:00:00Z",
    updatedAt: "2026-04-29T08:00:00Z",
  };

  function envelope(data: unknown, pagination?: unknown) {
    return {
      success: true,
      data,
      error: null,
      meta: {
        requestId: "r",
        timestamp: "t",
        ...(pagination ? { pagination } : {}),
      },
    };
  }

  const resolveNames = async (ids: string[]) =>
    new Map(ids.map((id) => [id, `Tên ${id}`]));

  it("getLeaveRequests?classId= drains the inbox and maps every row", async () => {
    const get = vi.fn().mockResolvedValue(envelope([submitted]));
    const repo = new DisciplineRepository(makeHttp({ get }), resolveNames);

    const rows = await repo.getLeaveRequests({ classId: "cls-10a1" });

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toBe(
      "/core/api/v1/conduct/student-leave-requests",
    );
    expect(get.mock.calls[0][1].params).toMatchObject({ classId: "cls-10a1" });
    // The list endpoint is cursor-paginated → the envelope must be read raw.
    expect(get.mock.calls[0][1].raw).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("req-1");
    expect(rows[0].studentName).toBe("Tên stu-1");
    expect(rows[0].submittedBy).toBe("parent");
    expect(rows[0].status).toBe("pending");
  });

  it("getLeaveRequests follows the cursor until the last page", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(
        envelope([submitted], { hasMore: true, nextCursor: "c2" }),
      )
      .mockResolvedValueOnce(
        envelope([{ ...submitted, requestId: "req-2" }], { hasMore: false }),
      );
    const repo = new DisciplineRepository(makeHttp({ get }), resolveNames);

    const rows = await repo.getLeaveRequests({ classId: "cls-10a1" });

    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[1][1].params.cursor).toBe("c2");
    expect(rows.map((r) => r.id)).toEqual(["req-1", "req-2"]);
  });

  it("getLeaveRequests WITHOUT a classId is refused before any HTTP call (core requires exactly one of classId/studentMemberId)", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http, resolveNames);

    await expect(repo.getLeaveRequests({})).rejects.toMatchObject({
      type: "not-found",
    });
    expect(http.get).not.toHaveBeenCalled();
  });

  it("getLeaveRequests still returns rows when the name lookup fails (raw ids, never a blank inbox)", async () => {
    const get = vi.fn().mockResolvedValue(envelope([submitted]));
    const repo = new DisciplineRepository(makeHttp({ get }), async () => {
      throw new Error("directory down");
    });

    const rows = await repo.getLeaveRequests({ classId: "cls-10a1" });

    expect(rows[0].studentName).toBe("stu-1");
  });

  it("getLeaveRequests maps a core error code to the failure union (never a raw ApiError)", async () => {
    const get = vi
      .fn()
      .mockRejectedValue(apiError("LEAVE_REQUEST_FORBIDDEN", 403));
    const repo = new DisciplineRepository(makeHttp({ get }), resolveNames);

    await expect(
      repo.getLeaveRequests({ classId: "cls-10a1" }),
    ).rejects.toMatchObject({ type: "forbidden" });
  });

  it("approveLeave POSTs to /{id}/approve with studentMemberId as a QUERY param", async () => {
    const post = vi.fn().mockResolvedValue({
      ...submitted,
      state: "APPROVED",
      approverMemberId: "gvcn-1",
    });
    const repo = new DisciplineRepository(makeHttp({ post }), resolveNames);

    const updated = await repo.approveLeave({
      id: "req-1",
      studentMemberId: "stu-1",
      classId: "cls-10a1",
      authCtx: { role: "teacher", homeroomClassIds: ["cls-10a1"] },
    });

    expect(post.mock.calls[0][0]).toBe(
      "/core/api/v1/conduct/student-leave-requests/req-1/approve",
    );
    expect(post.mock.calls[0][2]).toEqual({
      params: { studentMemberId: "stu-1" },
    });
    expect(updated.status).toBe("approved");
    expect(updated.approvedBy).toBe("Tên gvcn-1");
  });

  it("rejectLeave POSTs { rejectionReason } alongside the studentMemberId query", async () => {
    const post = vi.fn().mockResolvedValue({
      ...submitted,
      state: "REJECTED",
      approverMemberId: "gvcn-1",
      rejectionReason: "Đã nghỉ quá 5 ngày trong tháng",
    });
    const repo = new DisciplineRepository(makeHttp({ post }), resolveNames);

    const updated = await repo.rejectLeave({
      id: "req-1",
      studentMemberId: "stu-1",
      classId: "cls-10a1",
      reason: "Đã nghỉ quá 5 ngày trong tháng",
      authCtx: { role: "teacher", homeroomClassIds: ["cls-10a1"] },
    });

    expect(post.mock.calls[0][0]).toBe(
      "/core/api/v1/conduct/student-leave-requests/req-1/reject",
    );
    expect(post.mock.calls[0][1]).toEqual({
      rejectionReason: "Đã nghỉ quá 5 ngày trong tháng",
    });
    expect(post.mock.calls[0][2]).toEqual({
      params: { studentMemberId: "stu-1" },
    });
    expect(updated.status).toBe("rejected");
    expect(updated.rejectedBy).toBe("Tên gvcn-1");
  });

  // decision 0063 forge-role proof, straight at the repository — no UI, no
  // use-case, no network mock needed: the denial must happen BEFORE `http.post`.
  it("approveLeave with a forged authCtx never reaches the wire", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http, resolveNames);

    await expect(
      repo.approveLeave({
        id: "req-1",
        studentMemberId: "stu-1",
        classId: "cls-10a1",
        authCtx: { role: "teacher", homeroomClassIds: ["cls-99z9"] },
      }),
    ).rejects.toMatchObject({ type: "forbidden" });
    expect(http.post).not.toHaveBeenCalled();
  });

  it("rejectLeave with a forged role never reaches the wire", async () => {
    const http = makeHttp();
    const repo = new DisciplineRepository(http, resolveNames);

    for (const role of ["principal", "admin", "student", "parent"]) {
      await expect(
        repo.rejectLeave({
          id: "req-1",
          studentMemberId: "stu-1",
          classId: "cls-10a1",
          reason: "Lý do từ chối hợp lệ",
          authCtx: { role, homeroomClassIds: ["cls-10a1"] },
        }),
      ).rejects.toMatchObject({ type: "forbidden" });
    }
    expect(http.post).not.toHaveBeenCalled();
  });

  it("maps core's own 403 to the SAME forbidden key the local guard throws", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(apiError("LEAVE_REQUEST_FORBIDDEN", 403));
    const repo = new DisciplineRepository(makeHttp({ post }), resolveNames);

    await expect(
      repo.approveLeave({
        id: "req-1",
        studentMemberId: "stu-1",
        classId: "cls-10a1",
        authCtx: { role: "teacher", homeroomClassIds: ["cls-10a1"] },
      }),
    ).rejects.toMatchObject({ type: "forbidden" });
  });
});
