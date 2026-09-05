import { describe, expect, it } from "vitest";
import { resolveClassHubTab } from "./tab-resolver";

/**
 * US-E24.8 AC — "URL is the state": `?tab=` decides which tab body the RSC page
 * renders, but only after this pure resolver validates it against the viewer's
 * roles. An invalid/forbidden value silently falls back to the role default
 * (never a 404, never an empty shell).
 */
describe("resolveClassHubTab", () => {
  it("keeps a valid requested tab (GVBM asking for the timetable)", () => {
    expect(resolveClassHubTab(["subject"], "timetable")).toBe("timetable");
  });

  it("keeps ?tab=homeroom when the teacher IS the homeroom teacher", () => {
    expect(resolveClassHubTab(["homeroom", "subject"], "homeroom")).toBe(
      "homeroom",
    );
  });

  it("AC: ?tab=homeroom on a class the teacher is NOT GVCN of falls back to the default", () => {
    expect(resolveClassHubTab(["subject"], "homeroom")).toBe("students");
  });

  it("default is `students` for a GVBM class (no tab param)", () => {
    expect(resolveClassHubTab(["subject"], undefined)).toBe("students");
  });

  it("default is `homeroom` for a pure-GVCN class (no subject assignment here)", () => {
    expect(resolveClassHubTab(["homeroom"], undefined)).toBe("homeroom");
  });

  it("default is `students` for a dual-role class (GVBM wins the default)", () => {
    expect(resolveClassHubTab(["homeroom", "subject"], undefined)).toBe(
      "students",
    );
  });

  it("an unknown/garbage tab value falls back to the default rather than rendering nothing", () => {
    expect(resolveClassHubTab(["subject"], "../etc/passwd")).toBe("students");
    expect(resolveClassHubTab(["subject"], "")).toBe("students");
    expect(resolveClassHubTab(["homeroom"], "sessions")).toBe("homeroom");
  });

  it("a repeated ?tab= (array param) is not a valid tab id → default", () => {
    expect(resolveClassHubTab(["subject"], ["timetable", "course"])).toBe(
      "students",
    );
  });
});
