import { describe, expect, it } from "vitest";
import { fileTypeLabel, fileTypeTone } from "./lesson-file-type";

describe("fileTypeTone", () => {
  it("pdf → error", () => expect(fileTypeTone("pdf")).toBe("error"));
  it("pptx → warning", () => expect(fileTypeTone("pptx")).toBe("warning"));
  it("mp4 → info", () => expect(fileTypeTone("mp4")).toBe("info"));
  it("link → primary", () => expect(fileTypeTone("link")).toBe("primary"));
});

describe("fileTypeLabel", () => {
  it("pdf → PDF", () => expect(fileTypeLabel("pdf")).toBe("PDF"));
  it("pptx → PPTX", () => expect(fileTypeLabel("pptx")).toBe("PPTX"));
  it("mp4 → Video", () => expect(fileTypeLabel("mp4")).toBe("Video"));
  it("link → Link", () => expect(fileTypeLabel("link")).toBe("Link"));
});
