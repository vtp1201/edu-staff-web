import { describe, expect, it } from "vitest";
import { extractFirstUrl } from "../extract-first-url";

/**
 * D4: a LESSON body is PLAIN TEXT that may mention a video link. This function
 * only FINDS a candidate — it is not the security gate (`embedSourceFor` is),
 * so it deliberately returns non-allowlisted URLs too and lets the allowlist
 * reject them downstream.
 */
describe("extractFirstUrl", () => {
  it("returns null when the text carries no https URL", () => {
    expect(extractFirstUrl("Đọc kỹ ví dụ trước khi làm bài tập.")).toBeNull();
    expect(extractFirstUrl("")).toBeNull();
  });

  it("finds the first https URL in a paragraph", () => {
    expect(
      extractFirstUrl(
        "Xem video: https://www.youtube.com/watch?v=abc123 rồi làm bài.",
      ),
    ).toBe("https://www.youtube.com/watch?v=abc123");
  });

  it("returns the FIRST url when several are present", () => {
    expect(
      extractFirstUrl(
        "https://drive.google.com/file/d/1/view và https://youtu.be/x",
      ),
    ).toBe("https://drive.google.com/file/d/1/view");
  });

  it("returns a non-allowlisted URL verbatim (the allowlist is the gate, not this)", () => {
    expect(extractFirstUrl("Tải tại https://example.edu.vn/a.pdf")).toBe(
      "https://example.edu.vn/a.pdf",
    );
  });

  it("does not swallow trailing sentence punctuation or brackets", () => {
    expect(extractFirstUrl("Xem https://youtu.be/abc123.")).toBe(
      "https://youtu.be/abc123",
    );
    expect(extractFirstUrl("Xem (https://youtu.be/abc123), rồi làm.")).toBe(
      "https://youtu.be/abc123",
    );
  });

  it("ignores an http:// (non-TLS) link — it can never be embedded anyway", () => {
    expect(extractFirstUrl("http://www.youtube.com/watch?v=x")).toBeNull();
  });
});
