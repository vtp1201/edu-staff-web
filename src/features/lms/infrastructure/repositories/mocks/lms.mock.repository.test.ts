/**
 * `MockLmsRepository` behaviour parity (US-E24.1). The mock is only useful if
 * it fails the way the REAL service fails — otherwise mock-mode development
 * teaches the screens the wrong error surface.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MOCK_ASSIGNMENTS,
  MOCK_CLASS_ID,
  MOCK_COURSE_ITEMS,
  MOCK_DRAFT_COURSE_ID,
} from "./lms.fixtures";
import { MockLmsRepository } from "./lms.mock.repository";

let repo: MockLmsRepository;

beforeEach(() => {
  // `mockDelay` no-ops in production — keeps this suite off a real 300ms/call sleep.
  vi.stubEnv("NODE_ENV", "production");
  repo = new MockLmsRepository();
});

describe("fixtures cover the whole contract surface", () => {
  it("has all four item types", () => {
    const types = new Set(MOCK_COURSE_ITEMS.map((i) => i.itemType));
    expect([...types].sort()).toEqual([
      "ASSIGNMENT",
      "DOCUMENT",
      "EXAM",
      "LESSON",
    ]);
  });

  it("has all three states", () => {
    const states = new Set(MOCK_COURSE_ITEMS.map((i) => i.state));
    expect([...states].sort()).toEqual(["CLOSED", "OPEN", "UPCOMING_HIDDEN"]);
  });

  it("only an EXAM tile is UPCOMING_HIDDEN (the contract's single exception)", () => {
    const hidden = MOCK_COURSE_ITEMS.filter(
      (i) => i.state === "UPCOMING_HIDDEN",
    );
    expect(hidden.length).toBeGreaterThan(0);
    for (const item of hidden) expect(item.itemType).toBe("EXAM");
  });

  it("only an EXAM tile carries an exam block", () => {
    for (const item of MOCK_COURSE_ITEMS) {
      if (item.itemType !== "EXAM") expect(item.exam).toBeNull();
    }
  });
});

describe("list reads", () => {
  it("returns the class's courses", async () => {
    const courses = await repo.listCourses(MOCK_CLASS_ID);
    expect(courses.length).toBeGreaterThan(0);
    expect(courses[0]).not.toHaveProperty("description");
  });

  it("rejects a foreign classId with `forbidden`, never an empty array", async () => {
    await expect(repo.listCourses("cl-someone-else")).rejects.toEqual({
      type: "forbidden",
    });
  });

  it("rejects an unknown course timeline with `not-found`", async () => {
    await expect(repo.listItems("co-nope")).rejects.toEqual({
      type: "not-found",
    });
  });

  it("assignment list rows carry no state/instructions", async () => {
    const rows = await repo.listAssignments(MOCK_CLASS_ID);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).not.toHaveProperty("state");
    expect(rows[0]).not.toHaveProperty("instructions");
  });
});

describe("submission single-attempt policy", () => {
  const alreadySubmitted = "as-toan-11";
  const openAssignment = MOCK_ASSIGNMENTS.find((a) => a.id === "as-toan-12");

  it("returns the seeded submission WITH content for `/me`", async () => {
    const sub = await repo.getMySubmission(alreadySubmitted);
    expect(sub?.content).toBeTruthy();
    expect(sub?.status).toBe("SUBMITTED");
  });

  it("returns null (not a failure) when the student has not submitted", async () => {
    await expect(repo.getMySubmission("as-ly-3")).resolves.toBeNull();
  });

  it("rejects a second attempt with `already-submitted`", async () => {
    await expect(repo.submitAssignment(alreadySubmitted, "x")).rejects.toEqual({
      type: "already-submitted",
    });
  });

  it("rejects a past-deadline submit with `closed`", async () => {
    // `as-van-2` is seeded with a dueAt in the past relative to the fixture clock.
    await expect(repo.submitAssignment("as-van-2", "x")).rejects.toEqual({
      type: "closed",
    });
  });

  it("accepts a first submit on an open assignment, then refuses a second", async () => {
    expect(openAssignment).toBeDefined();
    vi.setSystemTime(new Date("2026-05-02T00:00:00.000Z"));
    const created = await repo.submitAssignment("as-toan-12", "Bài làm mới");
    expect(created.content).toBe("Bài làm mới");
    expect(created.status).toBe("SUBMITTED");

    await expect(repo.submitAssignment("as-toan-12", "again")).rejects.toEqual({
      type: "already-submitted",
    });
    vi.useRealTimers();
  });
});

describe("teacher commands mirror the real conflict codes", () => {
  it("refuses a non-https document url", async () => {
    await expect(
      repo.addDocumentItem("co-toan-10", {
        title: "x",
        url: "http://insecure.example",
      }),
    ).rejects.toEqual({ type: "invalid-url" });
  });

  it("refuses moving an EXAM tile's window", async () => {
    await expect(
      repo.patchItem("co-toan-10", "ex-toan-1", { dueAt: null }),
    ).rejects.toEqual({ type: "exam-window-not-editable" });
  });

  it("refuses editing a LESSON tile's document fields", async () => {
    await expect(
      repo.patchItem("co-toan-10", "le-toan-1", { title: "x" }),
    ).rejects.toEqual({ type: "not-document" });
  });

  it("refuses a partial reorder", async () => {
    await expect(
      repo.reorderItems("co-toan-10", ["le-toan-1"]),
    ).rejects.toEqual({ type: "not-found" });
  });

  it("accepts a complete reorder and returns the new order", async () => {
    const before = await repo.listItems("co-ly-10");
    const reversed = [...before].reverse().map((i) => i.id);
    const after = await repo.reorderItems("co-ly-10", reversed);
    expect(after.map((i) => i.id)).toEqual(reversed);
    expect(after.map((i) => i.position)).toEqual(
      reversed.map((_, index) => index),
    );
  });
});

describe("publishCourse / deleteItem (US-E24.10)", () => {
  it("publishes a DRAFT course once and refuses the second call", async () => {
    const published = await repo.publishCourse(MOCK_DRAFT_COURSE_ID);
    expect(published.status).toBe("PUBLISHED");
    expect(published.publishedAt).not.toBeNull();

    await expect(repo.publishCourse(MOCK_DRAFT_COURSE_ID)).rejects.toEqual({
      type: "already-published",
    });
  });

  it("refuses to publish a course that does not exist", async () => {
    await expect(repo.publishCourse("co-nope")).rejects.toEqual({
      type: "not-found",
    });
  });

  it("deletes a DOCUMENT item and refuses the repeat delete", async () => {
    const doc = (await repo.listItems("co-toan-10")).find(
      (i) => i.itemType === "DOCUMENT",
    );
    expect(doc).toBeDefined();
    const id = doc?.id ?? "";

    await repo.deleteItem("co-toan-10", id);
    expect((await repo.listItems("co-toan-10")).some((i) => i.id === id)).toBe(
      false,
    );
    await expect(repo.deleteItem("co-toan-10", id)).rejects.toEqual({
      type: "not-found",
    });
  });

  it("refuses to delete a LESSON tile", async () => {
    await expect(repo.deleteItem("co-toan-10", "le-toan-1")).rejects.toEqual({
      type: "not-document",
    });
  });
});
