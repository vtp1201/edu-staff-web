import { describe, expect, it } from "vitest";

/**
 * US-E24.4 — "Bài kiểm tra" is now the cross-subject exam view of
 * `/student/courses`; this route is a permanent (308) alias. The exam DETAIL
 * route `/student/exams/[examId]` is untouched — it is still where an open
 * exam's CTA lands.
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

describe("legacy /student/exams", () => {
  it("308-redirects to the cross-subject exam view", async () => {
    const result = await renderPage();
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/t/t1/student/courses?view=exam");
    expect(result.status).toBe("308");
  });

  it("keeps the caller's locale and tenant", async () => {
    const result = await renderPage("en", "acme");
    expect(result.url).toBe("/en/t/acme/student/courses?view=exam");
  });
});
