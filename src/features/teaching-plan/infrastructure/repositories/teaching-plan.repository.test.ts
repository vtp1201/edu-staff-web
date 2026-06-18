/**
 * Integration tests — MockTeachingPlanRepository (US-E11.4).
 * Exercises the in-memory state machine: get / savePlanCell upsert /
 * submit (with insufficient-cells + not-draft rules) / approve / reject
 * (with not-submitted rule). Each `new` reseeds from fixtures (deterministic).
 */
import { describe, expect, it } from "vitest";
import type { TeachingPlanFailure } from "../../domain/failures/teaching-plan.failure";
import { MockTeachingPlanRepository } from "./mocks/teaching-plan.mock.repository";

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
