import { describe, expect, it } from "vitest";
import { classHubBase, classHubHref } from "./class-hub-href";

/**
 * US-E24.8 deep-link builders. Every caller (dashboard rows, teacher schedule
 * cells, the shell's own tab strip, the /students 308 redirect) builds its URL
 * here so the `?tab=` contract has ONE spelling.
 */
describe("classHubBase", () => {
  it("builds the locale+tenant scoped class-list base", () => {
    expect(classHubBase("vi", "truong-a")).toBe(
      "/vi/t/truong-a/teacher/classes",
    );
  });
});

describe("classHubHref", () => {
  it("appends the tab query param to the class detail route", () => {
    expect(
      classHubHref("/vi/t/truong-a/teacher/classes", "cls-10a1", "timetable"),
    ).toBe("/vi/t/truong-a/teacher/classes/cls-10a1?tab=timetable");
  });

  it("students deep-link (pending-grade rows + the legacy /students redirect)", () => {
    expect(
      classHubHref("/vi/t/t1/teacher/classes", "cls-11b2", "students"),
    ).toBe("/vi/t/t1/teacher/classes/cls-11b2?tab=students");
  });

  it("URL-encodes the class id (never lets a raw id break the path)", () => {
    expect(classHubHref("/vi/t/t1/teacher/classes", "a b/c", "course")).toBe(
      "/vi/t/t1/teacher/classes/a%20b%2Fc?tab=course",
    );
  });
});
