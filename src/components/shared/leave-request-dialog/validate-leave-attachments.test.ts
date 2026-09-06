import { describe, expect, it } from "vitest";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  validateLeaveAttachments,
} from "./validate-leave-attachments";

/** `size` is derived from the blob parts, so pad to the byte count we want. */
function file(name: string, bytes = 10, type = "image/jpeg"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("validateLeaveAttachments — extension allow-list", () => {
  it.each([
    "a.jpg",
    "a.jpeg",
    "a.png",
    "a.pdf",
    "A.JPG",
    "b.PDF",
  ])("accepts %s", (name) => {
    const result = validateLeaveAttachments([file(name)]);
    expect(result.valid.map((f) => f.name)).toEqual([name]);
    expect(result.rejected).toEqual([]);
  });

  it.each([
    "a.gif",
    "a.docx",
    "a.heic",
    "a.pdf.exe",
    "noextension",
  ])("rejects %s with reason 'ext'", (name) => {
    const result = validateLeaveAttachments([file(name)]);
    expect(result.valid).toEqual([]);
    expect(result.rejected.map((r) => r.reason)).toEqual(["ext"]);
  });
});

describe("validateLeaveAttachments — size cap", () => {
  it("accepts a file exactly at the 5MB cap", () => {
    const result = validateLeaveAttachments([
      file("a.png", MAX_ATTACHMENT_BYTES),
    ]);
    expect(result.valid).toHaveLength(1);
  });

  it("rejects a file over the cap with reason 'size'", () => {
    const result = validateLeaveAttachments([
      file("a.png", MAX_ATTACHMENT_BYTES + 1),
    ]);
    expect(result.valid).toEqual([]);
    expect(result.rejected[0].reason).toBe("size");
  });

  it("rejects an empty file (core 422s on a 0-byte upload)", () => {
    const result = validateLeaveAttachments([file("a.png", 0)]);
    expect(result.rejected[0].reason).toBe("size");
  });

  /** A wrong extension is reported as 'ext' even when it is also oversized —
   *  one reason per file, the most explanatory first. */
  it("reports 'ext' rather than 'size' when both are wrong", () => {
    const result = validateLeaveAttachments([
      file("a.gif", MAX_ATTACHMENT_BYTES + 1),
    ]);
    expect(result.rejected[0].reason).toBe("ext");
  });
});

describe("validateLeaveAttachments — count cap", () => {
  it("accepts exactly 3 files", () => {
    const result = validateLeaveAttachments([
      file("a.png"),
      file("b.png"),
      file("c.png"),
    ]);
    expect(result.valid).toHaveLength(MAX_ATTACHMENTS);
    expect(result.rejected).toEqual([]);
  });

  it("rejects the 4th file with reason 'count' and keeps the first 3", () => {
    const result = validateLeaveAttachments([
      file("a.png"),
      file("b.png"),
      file("c.png"),
      file("d.png"),
    ]);
    expect(result.valid.map((f) => f.name)).toEqual([
      "a.png",
      "b.png",
      "c.png",
    ]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toBe("count");
    expect(result.rejected[0].file.name).toBe("d.png");
  });

  /**
   * The dialog appends to an existing selection, so the cap has to account for
   * files already accepted — otherwise "add one more" three times uploads six.
   */
  it("counts already-accepted files against the cap", () => {
    const result = validateLeaveAttachments([file("d.png")], 3);
    expect(result.valid).toEqual([]);
    expect(result.rejected[0].reason).toBe("count");
  });

  it("an invalid file does NOT consume a slot", () => {
    const result = validateLeaveAttachments([
      file("bad.gif"),
      file("a.png"),
      file("b.png"),
      file("c.png"),
    ]);
    expect(result.valid.map((f) => f.name)).toEqual([
      "a.png",
      "b.png",
      "c.png",
    ]);
    expect(result.rejected.map((r) => r.reason)).toEqual(["ext"]);
  });
});

describe("validateLeaveAttachments — nothing selected", () => {
  it("returns two empty lists (attachments are OPTIONAL)", () => {
    expect(validateLeaveAttachments([])).toEqual({ valid: [], rejected: [] });
  });
});
