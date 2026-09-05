import { describe, expect, it } from "vitest";
import { embedSourceFor } from "../embed-source";

/**
 * THE security boundary of US-E24.5 (high-risk lane): whatever this function
 * returns is handed to an `<iframe src>`. Every case that is not an EXACT
 * hostname match on the allowlist, over https, MUST return `null` — the render
 * side has no second gate.
 *
 * Written red-first, before `embed-source.ts` existed.
 */
describe("embedSourceFor — allowlist (only these render in an iframe)", () => {
  it.each([
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "www.youtube.com",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ],
    [
      "https://youtube.com/watch?v=abc123",
      "youtube.com",
      "https://www.youtube.com/embed/abc123",
    ],
    [
      "https://youtu.be/abc123",
      "youtu.be",
      "https://www.youtube.com/embed/abc123",
    ],
    [
      "https://www.youtube.com/embed/abc123",
      "www.youtube.com",
      "https://www.youtube.com/embed/abc123",
    ],
    [
      "https://drive.google.com/file/d/1AbC/view?usp=sharing",
      "drive.google.com",
      "https://drive.google.com/file/d/1AbC/preview",
    ],
    [
      "https://docs.google.com/document/d/1AbC/edit",
      "docs.google.com",
      "https://docs.google.com/document/d/1AbC/preview",
    ],
    [
      "https://www.geogebra.org/m/abcdef",
      "www.geogebra.org",
      "https://www.geogebra.org/m/abcdef",
    ],
    [
      "https://geogebra.org/m/abcdef",
      "geogebra.org",
      "https://geogebra.org/m/abcdef",
    ],
  ])("accepts %s", (input, origin, embedUrl) => {
    expect(embedSourceFor(input)).toEqual({ origin, embedUrl });
  });

  it("matches the hostname case-insensitively (the URL parser lower-cases it)", () => {
    expect(embedSourceFor("https://WWW.YouTube.com/watch?v=abc123")).toEqual({
      origin: "www.youtube.com",
      embedUrl: "https://www.youtube.com/embed/abc123",
    });
  });

  it("keeps a Drive link that is ALREADY a /preview", () => {
    expect(
      embedSourceFor("https://drive.google.com/file/d/1AbC/preview"),
    ).toEqual({
      origin: "drive.google.com",
      embedUrl: "https://drive.google.com/file/d/1AbC/preview",
    });
  });
});

describe("embedSourceFor — rejects every bypass attempt", () => {
  it.each([
    // Suffix trick: the allowlisted name is a PREFIX of a hostile domain.
    ["https://youtube.com.evil.com/watch?v=x"],
    ["https://drive.google.com.evil.com/file/d/1/view"],
    // Substring/path trick: the allowlisted name appears in the PATH.
    ["https://evil.com/youtube.com"],
    ["https://evil.com/?next=https://www.youtube.com/embed/x"],
    // Subdomain trick: exact match only, no `endsWith(".youtube.com")`.
    ["https://evil.youtube.com/watch?v=x"],
    ["https://m.youtube.com/watch?v=x"],
    // Non-https schemes.
    ["http://www.youtube.com/watch?v=x"],
    ["javascript:alert(document.cookie)"],
    ["data:text/html;base64,PHNjcmlwdD4="],
    ["JavaScript:alert(1)"],
    // Protocol-relative + malformed: `new URL()` throws, we must not guess.
    ["//www.youtube.com/watch?v=x"],
    ["www.youtube.com/watch?v=x"],
    ["not a url at all"],
    [""],
    ["   "],
    // Embedded credentials — never render a URL that carries userinfo.
    ["https://evil:pass@www.youtube.com/watch?v=x"],
    // A plain non-allowlisted origin.
    ["https://example.edu.vn/video.mp4"],
  ])("returns null for %s", (input) => {
    expect(embedSourceFor(input)).toBeNull();
  });

  it("returns null for a YouTube watch URL with no video id", () => {
    expect(embedSourceFor("https://www.youtube.com/watch")).toBeNull();
    expect(embedSourceFor("https://youtu.be/")).toBeNull();
  });

  it("never echoes attacker-controlled query/fragment into the embed src", () => {
    const source = embedSourceFor(
      'https://www.youtube.com/watch?v=abc123&onerror="alert(1)#"><script>',
    );
    expect(source?.embedUrl).toBe("https://www.youtube.com/embed/abc123");
  });
});
