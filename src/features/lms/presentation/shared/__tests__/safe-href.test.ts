import { describe, expect, it } from "vitest";
import { hostOf, isSafeHref } from "../safe-href";

describe("isSafeHref", () => {
  it("accepts https and plain http (school material still lives on http hosts)", () => {
    expect(isSafeHref("https://example.edu.vn/bai-tap.pdf")).toBe(true);
    expect(isSafeHref("http://thpt-abc.edu.vn/tai-lieu")).toBe(true);
  });

  it("refuses script-bearing and other non-web schemes", () => {
    // The whole reason this gate exists — React 19 blocks it too, but the
    // anchor must not depend on that.
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("JaVaScRiPt:alert(1)")).toBe(false);
    expect(isSafeHref("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeHref("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeHref("file:///etc/passwd")).toBe(false);
  });

  it("refuses anything that is not a parseable absolute URL", () => {
    // A teacher typing a bare host, a sentence, or a protocol-relative URL:
    // we never guess a scheme on their behalf.
    expect(isSafeHref("drive.google.com/abc")).toBe(false);
    expect(isSafeHref("//evil.example/x")).toBe(false);
    expect(isSafeHref("xem tài liệu ở thư viện")).toBe(false);
    expect(isSafeHref("")).toBe(false);
    expect(isSafeHref("   ")).toBe(false);
  });
});

describe("hostOf", () => {
  it("returns the parsed hostname only", () => {
    expect(hostOf("https://example.edu.vn/a/b?c=d")).toBe("example.edu.vn");
    // Userinfo must not be echoed into the meta line as if it were the host.
    expect(hostOf("https://evil@drive.google.com/x")).toBe("drive.google.com");
  });

  it("returns null for an unparseable string", () => {
    expect(hostOf("không phải liên kết")).toBeNull();
  });
});
