import { describe, expect, it } from "vitest";

/**
 * US-E24.4 — "Bài tập" is no longer its own screen: it is the cross-subject
 * view of `/student/courses`, so this route is now a PERMANENT (308) alias.
 * 308 rather than 307 because the move is permanent — bookmarks, the old
 * sidebar link and any crawler should be rewritten (same call as the teacher
 * roster alias of US-E24.8).
 *
 * `redirect()` throws a `NEXT_REDIRECT;<type>;<url>;<status>;` digest
 * synchronously with no request context, so the RSC can be called directly in
 * node env and asserted on.
 */
function digestOf(err: unknown): string[] {
  return ((err as { digest?: string } | null)?.digest ?? "").split(";");
}

async function renderPage(locale = "vi", tenant = "t1") {
  const { default: Page } = await import("./page");
  try {
    await Page({ params: Promise.resolve({ locale, tenant }) });
    return { redirected: false, url: "", status: "" };
  } catch (err) {
    const parts = digestOf(err);
    return {
      redirected: parts[0] === "NEXT_REDIRECT",
      url: parts[2],
      status: parts[3],
    };
  }
}

describe("legacy /student/assignments", () => {
  it("308-redirects to the cross-subject assignment view", async () => {
    const result = await renderPage();
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/t/t1/student/courses?view=assignment");
    expect(result.status).toBe("308");
  });

  it("keeps the caller's locale and tenant (no hardcoded workspace)", async () => {
    const result = await renderPage("en", "acme");
    expect(result.url).toBe("/en/t/acme/student/courses?view=assignment");
  });
});
