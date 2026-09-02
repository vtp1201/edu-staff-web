import { describe, expect, it } from "vitest";
import { visibleTabs } from "./class-hub-tabs";

/**
 * US-E24.8 AC: a class where the teacher is GVCN (homeroom) shows 4 tabs; a
 * subject-only (GVBM) class shows 3 — the "Chủ nhiệm" tab is homeroom-gated.
 * Single source of truth for "is this tab allowed", shared by the resolver and
 * the tablist renderer.
 */
describe("visibleTabs", () => {
  it("GVCN + GVBM → all four tabs, homeroom last (design tab order)", () => {
    expect(visibleTabs(["homeroom", "subject"])).toEqual([
      "students",
      "timetable",
      "course",
      "homeroom",
    ]);
  });

  it("GVBM only → three tabs, no homeroom tab", () => {
    expect(visibleTabs(["subject"])).toEqual([
      "students",
      "timetable",
      "course",
    ]);
  });

  it("GVCN only → still four tabs (roster/timetable/course apply to the class itself)", () => {
    expect(visibleTabs(["homeroom"])).toEqual([
      "students",
      "timetable",
      "course",
      "homeroom",
    ]);
  });

  it("no role at all → the three class-scoped tabs (defensive, never crashes)", () => {
    expect(visibleTabs([])).toEqual(["students", "timetable", "course"]);
  });
});
