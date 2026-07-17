import { describe, expect, it } from "vitest";
import { MOCK_CURRENT_TEACHER_ID } from "./fixtures";
import { MockLessonPlanRepository } from "./mock-lesson-plan.repository";

describe("MockLessonPlanRepository", () => {
  it("listMine returns only the current teacher's plans (both statuses)", async () => {
    const repo = new MockLessonPlanRepository();
    const page = await repo.listMine({ limit: 50 });
    expect(page.items.length).toBeGreaterThan(0);
    expect(
      page.items.every((p) => p.teacherId === MOCK_CURRENT_TEACHER_ID),
    ).toBe(true);
    expect(page.items.some((p) => p.status === "DRAFT")).toBe(true);
    expect(page.items.some((p) => p.status === "PUBLISHED")).toBe(true);
  });

  it("seeds a 10-tag boundary plan and a 200-char title plan", async () => {
    const repo = new MockLessonPlanRepository();
    const page = await repo.listMine({ limit: 50 });
    expect(page.items.some((p) => p.tags.length === 10)).toBe(true);
    expect(page.items.some((p) => p.title.length === 200)).toBe(true);
  });

  it("DRAFT seed plans have no publishedAt key", async () => {
    const repo = new MockLessonPlanRepository();
    const draft = await repo.get("lp-2");
    expect(draft.status).toBe("DRAFT");
    expect(draft.publishedAt).toBeUndefined();
  });

  it("listBySubject returns only PUBLISHED plans for that subject (no DRAFT leak)", async () => {
    const repo = new MockLessonPlanRepository();
    const page = await repo.listBySubject({ subjectId: "sub-phys", limit: 50 });
    expect(page.items.length).toBeGreaterThan(0);
    expect(
      page.items.every(
        (p) => p.subjectId === "sub-phys" && p.status === "PUBLISHED",
      ),
    ).toBe(true);
    // lp-7 is another teacher's DRAFT for sub-phys — must never appear.
    expect(page.items.some((p) => p.planId === "lp-7")).toBe(false);
  });

  it("listBySubject applies the server-side tag filter", async () => {
    const repo = new MockLessonPlanRepository();
    const page = await repo.listBySubject({
      subjectId: "sub-phys",
      tag: "Chương 3",
      limit: 50,
    });
    expect(page.items.every((p) => p.tags.includes("Chương 3"))).toBe(true);
  });

  it("paginates with an index cursor + hasMore/nextCursor", async () => {
    const repo = new MockLessonPlanRepository();
    const first = await repo.listMine({ limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).toBe("2");
    const second = await repo.listMine({ cursor: first.nextCursor, limit: 2 });
    expect(second.items[0].planId).not.toBe(first.items[0].planId);
  });

  it("throws invalid-cursor on a malformed cursor", async () => {
    const repo = new MockLessonPlanRepository();
    await expect(repo.listMine({ cursor: "not-a-number" })).rejects.toThrow(
      "invalid-cursor",
    );
  });

  it("get throws not-found for an unknown id", async () => {
    const repo = new MockLessonPlanRepository();
    await expect(repo.get("nope")).rejects.toThrow("not-found");
  });

  it("create makes a DRAFT owned by the current teacher (no publishedAt)", async () => {
    const repo = new MockLessonPlanRepository();
    const created = await repo.create({
      subjectId: "sub-lit",
      gradeLevel: "10",
      title: "Giáo án mới",
    });
    expect(created.status).toBe("DRAFT");
    expect(created.teacherId).toBe(MOCK_CURRENT_TEACHER_ID);
    expect(created.publishedAt).toBeUndefined();
    const fetched = await repo.get(created.planId);
    expect(fetched.title).toBe("Giáo án mới");
  });

  it("update mutates in place and refreshes updatedAt", async () => {
    const repo = new MockLessonPlanRepository();
    const created = await repo.create({
      subjectId: "sub-lit",
      gradeLevel: "10",
      title: "Bản nháp",
    });
    const updated = await repo.update(created.planId, {
      gradeLevel: "11",
      title: "Bản nháp v2",
    });
    expect(updated.title).toBe("Bản nháp v2");
    expect(updated.gradeLevel).toBe("11");
  });

  it("publish flips to PUBLISHED, sets publishedAt, then rejects a 2nd publish", async () => {
    const repo = new MockLessonPlanRepository();
    const created = await repo.create({
      subjectId: "sub-lit",
      gradeLevel: "10",
      title: "Để phát hành",
    });
    const published = await repo.publish(created.planId);
    expect(published.status).toBe("PUBLISHED");
    expect(published.publishedAt).toBeTruthy();
    await expect(repo.publish(created.planId)).rejects.toThrow(
      "already-published",
    );
  });

  it("update on a PUBLISHED plan rejects with already-published", async () => {
    const repo = new MockLessonPlanRepository();
    const created = await repo.create({
      subjectId: "sub-lit",
      gradeLevel: "10",
      title: "Đã phát hành",
    });
    await repo.publish(created.planId);
    await expect(
      repo.update(created.planId, { gradeLevel: "10", title: "x" }),
    ).rejects.toThrow("already-published");
  });
});
