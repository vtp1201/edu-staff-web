import { describe, expect, it } from "vitest";
import { deriveClassRoles } from "./teacher-class.entity";

describe("deriveClassRoles (US-E24.7)", () => {
  it("returns both roles for a homeroom teacher who also teaches a subject there", () => {
    expect(deriveClassRoles(true, ["sub-math"])).toEqual([
      "homeroom",
      "subject",
    ]);
  });

  it("returns only 'homeroom' when there is no subject assignment", () => {
    expect(deriveClassRoles(true, undefined)).toEqual(["homeroom"]);
    expect(deriveClassRoles(true, [])).toEqual(["homeroom"]);
  });

  it("returns only 'subject' for a pure subject teacher", () => {
    expect(deriveClassRoles(false, ["sub-math", "sub-physics"])).toEqual([
      "subject",
    ]);
  });

  it("returns an empty role list when neither applies", () => {
    expect(deriveClassRoles(false, [])).toEqual([]);
  });

  it("keeps homeroom first so the badge order is stable", () => {
    expect(deriveClassRoles(true, ["sub-math"])[0]).toBe("homeroom");
  });
});
