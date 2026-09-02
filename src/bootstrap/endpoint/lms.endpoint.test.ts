/**
 * `LMS_EP` path snapshot — US-E24.1 (ADR 0075).
 *
 * The `lms` service is live behind Kong (`/lms/api/v1` route, strip_path,
 * upstream `http://lms:3004/api/v1`) and its own routes live under
 * `/api/v1/lms/...`. The DOUBLE `lms` segment is therefore correct and is the
 * single most likely thing to regress, so every path is asserted literally
 * against `services/lms/docs/openapi.yaml`.
 */
import { describe, expect, it } from "vitest";
import { LMS_EP, QUESTION_BANK_EP } from "./lms.endpoint";

const BASE = "/lms/api/v1/lms";

/** Every value in `LMS_EP`, resolved to a concrete path string. */
const RESOLVED: Record<string, string> = {
  courses: LMS_EP.courses,
  course: LMS_EP.course("c1"),
  publishCourse: LMS_EP.publishCourse("c1"),
  lessons: LMS_EP.lessons("c1"),
  lesson: LMS_EP.lesson("c1", "l1"),
  items: LMS_EP.items("c1"),
  itemDocuments: LMS_EP.itemDocuments("c1"),
  itemsOrder: LMS_EP.itemsOrder("c1"),
  item: LMS_EP.item("c1", "i1"),
  assignments: LMS_EP.assignments,
  assignment: LMS_EP.assignment("a1"),
  submissions: LMS_EP.submissions("a1"),
  mySubmission: LMS_EP.mySubmission("a1"),
  submission: LMS_EP.submission("a1", "s1"),
};

describe("LMS_EP — 1:1 with services/lms/docs/openapi.yaml", () => {
  it("matches the deployed contract exactly", () => {
    expect(RESOLVED).toEqual({
      courses: `${BASE}/courses`,
      course: `${BASE}/courses/c1`,
      publishCourse: `${BASE}/courses/c1/publish`,
      lessons: `${BASE}/courses/c1/lessons`,
      lesson: `${BASE}/courses/c1/lessons/l1`,
      items: `${BASE}/courses/c1/items`,
      itemDocuments: `${BASE}/courses/c1/items/documents`,
      itemsOrder: `${BASE}/courses/c1/items/order`,
      item: `${BASE}/courses/c1/items/i1`,
      assignments: `${BASE}/assignments`,
      assignment: `${BASE}/assignments/a1`,
      submissions: `${BASE}/assignments/a1/submissions`,
      mySubmission: `${BASE}/assignments/a1/submissions/me`,
      submission: `${BASE}/assignments/a1/submissions/s1`,
    });
  });

  it("every path is gateway-prefixed with the double `lms` segment", () => {
    for (const [name, path] of Object.entries(RESOLVED)) {
      expect(`${name}:${path}`).toBe(`${name}:${path}`);
      expect(path.startsWith(`${BASE}/`)).toBe(true);
    }
  });

  it("carries no query string — filters travel as axios `params`", () => {
    for (const path of Object.values(RESOLVED)) {
      expect(path).not.toContain("?");
    }
  });

  it("no longer exposes the pre-US-E24.1 scaffold shapes", () => {
    const all = Object.values(RESOLVED).join("\n");
    // Old (wrong) single-`lms` prefix, student-scoped list, and the three
    // routes BE never implemented (notes, Q&A, mark-complete).
    expect(all).not.toMatch(/\/lms\/api\/v1\/courses/);
    expect(all).not.toContain("/students/");
    expect(all).not.toContain("/note");
    expect(all).not.toContain("/questions");
    expect(all).not.toContain("/complete");
    const keys = Object.keys(LMS_EP);
    expect(keys).not.toContain("completeLesson");
    expect(keys).not.toContain("note");
    expect(keys).not.toContain("questions");
    expect(keys).not.toContain("courseLessons");
    expect(keys).not.toContain("submitAssignment");
  });

  it("percent-encodes path parameters", () => {
    expect(LMS_EP.course("a/b")).toBe(`${BASE}/courses/a%2Fb`);
    expect(LMS_EP.submission("a 1", "s/1")).toBe(
      `${BASE}/assignments/a%201/submissions/s%2F1`,
    );
  });

  it("leaves the unrelated core Question Bank endpoints untouched", () => {
    expect(QUESTION_BANK_EP.search).toBe(
      "/core/api/v1/courseware/questions/search",
    );
    expect(QUESTION_BANK_EP.list).toBe("/core/api/v1/courseware/questions");
    expect(QUESTION_BANK_EP.detail("q1")).toBe(
      "/core/api/v1/courseware/questions/q1",
    );
    expect(QUESTION_BANK_EP.publish("q1")).toBe(
      "/core/api/v1/courseware/questions/q1/publish",
    );
  });
});
