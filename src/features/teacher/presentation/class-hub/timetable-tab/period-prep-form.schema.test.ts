/**
 * QA gap-fill (US-E24.9) — `periodPrepSchema` is a pure, exported factory but
 * had zero direct test coverage; it was only exercised indirectly through
 * `PeriodPrepForm` rendering (jsdom is unavailable in this repo, so schema
 * behaviour couldn't be proven at the component layer anyway). This proves the
 * AC bounds directly: ≤20 materials, url must be http(s), title required.
 */
import { describe, expect, it } from "vitest";
import {
  MAX_MATERIAL_URL_LENGTH,
  MAX_MATERIALS,
  MAX_NOTE_LENGTH,
} from "@/features/period-log/domain/entities/period-prep.entity";
import { periodPrepSchema } from "./period-prep-form.schema";

const t = {
  noteTooLong: "note-too-long",
  materialTitleRequired: "material-title-required",
  materialUrlInvalid: "material-url-invalid",
  materialUrlTooLong: "material-url-too-long",
};

const schema = periodPrepSchema(t);

function values(over: Partial<Parameters<typeof schema.parse>[0]> = {}) {
  return {
    note: "",
    lessonPlanId: "",
    materials: [],
    ...over,
  };
}

describe("periodPrepSchema", () => {
  it("accepts an empty note/no materials (nothing prepared yet)", () => {
    expect(schema.safeParse(values()).success).toBe(true);
  });

  it("rejects a note past MAX_NOTE_LENGTH", () => {
    const result = schema.safeParse(
      values({ note: "x".repeat(MAX_NOTE_LENGTH + 1) }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("note-too-long");
    }
  });

  it("accepts a note exactly at MAX_NOTE_LENGTH (boundary, not off-by-one)", () => {
    expect(
      schema.safeParse(values({ note: "x".repeat(MAX_NOTE_LENGTH) })).success,
    ).toBe(true);
  });

  it.each([
    "https://geogebra.org/m/abc",
    "http://example.com",
  ])("accepts an http(s) material url (%s)", (url) => {
    const result = schema.safeParse(
      values({ materials: [{ title: "GeoGebra", url }] }),
    );
    expect(result.success).toBe(true);
  });

  it.each([
    "ftp://example.com/file",
    "javascript:alert(1)",
    "not-a-url",
    "",
  ])("rejects a non-http(s)/malformed material url (%s)", (url) => {
    const result = schema.safeParse(
      values({ materials: [{ title: "Tài liệu", url }] }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const urlIssue = result.error.issues.find((i) => i.path.includes("url"));
      expect(urlIssue?.message).toBe("material-url-invalid");
    }
  });

  it("rejects a material url longer than MAX_MATERIAL_URL_LENGTH", () => {
    const longUrl = `https://example.com/${"a".repeat(MAX_MATERIAL_URL_LENGTH)}`;
    const result = schema.safeParse(
      values({ materials: [{ title: "Tài liệu", url: longUrl }] }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const urlIssue = result.error.issues.find((i) => i.path.includes("url"));
      expect(urlIssue?.message).toBe("material-url-too-long");
    }
  });

  it("rejects an empty material title", () => {
    const result = schema.safeParse(
      values({
        materials: [{ title: "", url: "https://example.com" }],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a 21st material (cap is MAX_MATERIALS)", () => {
    const materials = Array.from({ length: MAX_MATERIALS + 1 }, (_, i) => ({
      title: `Tài liệu ${i + 1}`,
      url: `https://example.org/${i + 1}`,
    }));
    expect(schema.safeParse(values({ materials })).success).toBe(false);
  });

  it("accepts exactly MAX_MATERIALS materials (boundary, not off-by-one)", () => {
    const materials = Array.from({ length: MAX_MATERIALS }, (_, i) => ({
      title: `Tài liệu ${i + 1}`,
      url: `https://example.org/${i + 1}`,
    }));
    expect(schema.safeParse(values({ materials })).success).toBe(true);
  });
});
