/**
 * Integration tests — MockTeachingPlanRepository (US-E11.4) +
 * TeachingPlanRepository (real, US-E18.9 — permanent blocked stub) +
 * `toFailure` ground-truthed error mapping.
 *
 * Mock section exercises the in-memory state machine: get / savePlanCell
 * upsert / submit (with insufficient-cells + not-draft rules) / approve /
 * reject (with not-submitted rule). Each `new` reseeds from fixtures
 * (deterministic).
 *
 * Real-repo section (US-E18.9): the real contract was ground-truthed against
 * `edu-api/services/core/docs/openapi.yaml`'s `TeachingPlan (LMS)` tag + Go
 * source (`internal/lms/teachingplan/core/domain/domainerror/errors.go`,
 * `internal/lms/teachingplan/adapter/http/routes.go`) and found unwireable
 * for this screen (term-vs-academicYear key mismatch, no period axis, no
 * endpoint to edit an existing plan's entries at all) — see the story packet
 * and `teaching-plan.repository.ts`'s class doc comment. `toFailure` is kept
 * correct + tested for the day this unblocks; the repository methods are
 * permanent blocked stubs that never call `http.*` (the DI factory
 * force-mocks regardless of `USE_MOCK` — see `teaching-plan.di.ts`).
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { TeachingPlanFailure } from "../../domain/failures/teaching-plan.failure";
import { MockTeachingPlanRepository } from "./mocks/teaching-plan.mock.repository";
import { TeachingPlanRepository, toFailure } from "./teaching-plan.repository";

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function makeHttp(): AxiosInstance {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as AxiosInstance;
}

describe("toFailure — ground-truthed core error matrix (US-E18.9)", () => {
  it("maps NETWORK_ERROR → network-error", () => {
    expect(toFailure(apiError("NETWORK_ERROR", 0)).type).toBe("network-error");
  });

  it("maps TEACHING_PLAN_NOT_FOUND (404) → not-found", () => {
    expect(toFailure(apiError("TEACHING_PLAN_NOT_FOUND", 404)).type).toBe(
      "not-found",
    );
  });

  it("maps TEACHING_PLAN_INVALID_STATUS_TRANSITION (409) → not-draft", () => {
    expect(
      toFailure(apiError("TEACHING_PLAN_INVALID_STATUS_TRANSITION", 409)).type,
    ).toBe("not-draft");
  });

  it("maps TEACHING_PLAN_NOT_OWNER (403) → unauthorized", () => {
    expect(toFailure(apiError("TEACHING_PLAN_NOT_OWNER", 403)).type).toBe(
      "unauthorized",
    );
  });

  it("maps TEACHING_PLAN_CLASS_SUBJECT_NOT_FOUND (404, create-time) → not-found", () => {
    expect(
      toFailure(apiError("TEACHING_PLAN_CLASS_SUBJECT_NOT_FOUND", 404)).type,
    ).toBe("not-found");
  });

  it("maps TEACHING_PLAN_TEACHER_NOT_ASSIGNED (403, create-time) → unauthorized", () => {
    expect(
      toFailure(apiError("TEACHING_PLAN_TEACHER_NOT_ASSIGNED", 403)).type,
    ).toBe("unauthorized");
  });

  it("maps TEACHING_PLAN_FORBIDDEN (403) → unauthorized", () => {
    expect(toFailure(apiError("TEACHING_PLAN_FORBIDDEN", 403)).type).toBe(
      "unauthorized",
    );
  });

  it("falls back to unknown for an unrecognised code", () => {
    const failure = toFailure(apiError("SOMETHING_UNKNOWN", 500));
    expect(failure.type).toBe("unknown");
  });
});

describe("TeachingPlanRepository — permanent blocked stubs (US-E18.9)", () => {
  it("getTeachingPlan always fails without calling http.get", async () => {
    const http = makeHttp();
    const repo = new TeachingPlanRepository(http);
    await expect(
      repo.getTeachingPlan("sub-toan", "cls-10a", "HKI"),
    ).rejects.toEqual({ type: "network-error" });
    expect(http.get).not.toHaveBeenCalled();
  });

  it("savePlanCell always fails without calling http.post", async () => {
    const http = makeHttp();
    const repo = new TeachingPlanRepository(http);
    await expect(
      repo.savePlanCell("plan-1", { week: 1, period: 1, title: "x" }),
    ).rejects.toEqual({ type: "network-error" });
    expect(http.post).not.toHaveBeenCalled();
  });

  it("submitPlan always fails without calling http.post", async () => {
    const http = makeHttp();
    const repo = new TeachingPlanRepository(http);
    await expect(repo.submitPlan("plan-1")).rejects.toEqual({
      type: "network-error",
    });
    expect(http.post).not.toHaveBeenCalled();
  });

  it("approvePlan always fails without calling http.post", async () => {
    const http = makeHttp();
    const repo = new TeachingPlanRepository(http);
    await expect(repo.approvePlan("plan-1")).rejects.toEqual({
      type: "network-error",
    });
    expect(http.post).not.toHaveBeenCalled();
  });

  it("rejectPlan always fails without calling http.post", async () => {
    const http = makeHttp();
    const repo = new TeachingPlanRepository(http);
    await expect(repo.rejectPlan("plan-1", "reason")).rejects.toEqual({
      type: "network-error",
    });
    expect(http.post).not.toHaveBeenCalled();
  });

  it("listPendingPlans always fails without calling http.get", async () => {
    const http = makeHttp();
    const repo = new TeachingPlanRepository(http);
    await expect(repo.listPendingPlans({})).rejects.toEqual({
      type: "network-error",
    });
    expect(http.get).not.toHaveBeenCalled();
  });
});

describe("MockTeachingPlanRepository", () => {
  it("getTeachingPlan returns a seeded plan by subject/class/term", async () => {
    const repo = new MockTeachingPlanRepository();
    const plan = await repo.getTeachingPlan("sub-toan", "cls-10a", "HKI");
    expect(plan?.id).toBe("plan-1");
    expect(plan?.status).toBe("DRAFT");
  });

  it("getTeachingPlan returns null for an unknown combination", async () => {
    const repo = new MockTeachingPlanRepository();
    const plan = await repo.getTeachingPlan("nope", "nope", "HKI");
    expect(plan).toBeNull();
  });

  it("savePlanCell upserts a cell in a draft plan", async () => {
    const repo = new MockTeachingPlanRepository();
    const before = await repo.getTeachingPlan("sub-toan", "cls-10a", "HKI");
    const count = before?.cells.length ?? 0;

    const updated = await repo.savePlanCell("plan-1", {
      week: 35,
      period: 3,
      title: "Ôn tập cuối kỳ",
    });

    expect(updated.cells.length).toBe(count + 1);
    expect(
      updated.cells.find((c) => c.week === 35 && c.period === 3)?.title,
    ).toBe("Ôn tập cuối kỳ");
  });

  it("savePlanCell overwrites an existing cell (same week+period)", async () => {
    const repo = new MockTeachingPlanRepository();
    const before = await repo.getTeachingPlan("sub-toan", "cls-10a", "HKI");
    const count = before?.cells.length ?? 0;

    const updated = await repo.savePlanCell("plan-1", {
      week: 1,
      period: 1,
      title: "Tiêu đề mới",
    });

    expect(updated.cells.length).toBe(count);
    expect(
      updated.cells.find((c) => c.week === 1 && c.period === 1)?.title,
    ).toBe("Tiêu đề mới");
  });

  it("submitPlan throws insufficient-cells when below 50% filled", async () => {
    const repo = new MockTeachingPlanRepository();
    const failure: TeachingPlanFailure = { type: "insufficient-cells" };
    // plan-1 has 40/105 cells.
    await expect(repo.submitPlan("plan-1")).rejects.toEqual(failure);
  });

  it("submitPlan throws not-draft when plan is already submitted", async () => {
    const repo = new MockTeachingPlanRepository();
    const failure: TeachingPlanFailure = { type: "not-draft" };
    // plan-2 is SUBMITTED.
    await expect(repo.submitPlan("plan-2")).rejects.toEqual(failure);
  });

  it("submitPlan succeeds when ≥50% filled", async () => {
    const repo = new MockTeachingPlanRepository();
    // plan-1 starts at 40/105; required = ceil(105*0.5) = 53. Add 14 new cells
    // in the empty upper-week region (weeks 20+ are untouched by the 40 seeded).
    for (let i = 0; i < 14; i++) {
      const week = 20 + Math.floor(i / 3);
      const period = (i % 3) + 1;
      await repo.savePlanCell("plan-1", {
        week,
        period,
        title: `Bổ sung ${i}`,
      });
    }
    const submitted = await repo.submitPlan("plan-1");
    expect(submitted.status).toBe("SUBMITTED");
  }, 15000);

  it("approvePlan moves a submitted plan to APPROVED", async () => {
    const repo = new MockTeachingPlanRepository();
    const approved = await repo.approvePlan("plan-2");
    expect(approved.status).toBe("APPROVED");
  });

  it("approvePlan throws not-submitted for a draft plan", async () => {
    const repo = new MockTeachingPlanRepository();
    const failure: TeachingPlanFailure = { type: "not-submitted" };
    await expect(repo.approvePlan("plan-1")).rejects.toEqual(failure);
  });

  it("rejectPlan moves a submitted plan to REJECTED with reason", async () => {
    const repo = new MockTeachingPlanRepository();
    const rejected = await repo.rejectPlan(
      "plan-2",
      "Thiếu nội dung tuần cuối",
    );
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionReason).toBe("Thiếu nội dung tuần cuối");
  });

  it("rejectPlan throws not-submitted for a draft plan", async () => {
    const repo = new MockTeachingPlanRepository();
    const failure: TeachingPlanFailure = { type: "not-submitted" };
    await expect(repo.rejectPlan("plan-1", "lý do dài hơn")).rejects.toEqual(
      failure,
    );
  });

  it("listPendingPlans returns only SUBMITTED plans", async () => {
    const repo = new MockTeachingPlanRepository();
    const pending = await repo.listPendingPlans({});
    expect(pending.every((p) => p.status === "SUBMITTED")).toBe(true);
    expect(pending.map((p) => p.id)).toContain("plan-2");
  });

  it("listPendingPlans applies the subject filter", async () => {
    const repo = new MockTeachingPlanRepository();
    const pending = await repo.listPendingPlans({ subjectId: "sub-anh" });
    expect(pending).toHaveLength(0);
  });

  it("not-found is thrown for an unknown plan id", async () => {
    const repo = new MockTeachingPlanRepository();
    const failure: TeachingPlanFailure = { type: "not-found" };
    await expect(repo.submitPlan("ghost")).rejects.toEqual(failure);
  });
});
