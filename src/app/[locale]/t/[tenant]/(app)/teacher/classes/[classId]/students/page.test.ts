import { describe, expect, it } from "vitest";

/**
 * US-E24.8 AC: the old roster deep-link keeps working — `/teacher/classes/<id>
 * /students` is now a PERMANENT (308) alias of the hub's students tab. 308 (not
 * 307) because the move is permanent: bookmarks/crawlers should update.
 */
function digestOf(err: unknown): string[] {
  return ((err as { digest?: string } | null)?.digest ?? "").split(";");
}

async function renderPage(classId = "cls-10a1") {
  const { default: Page } = await import("./page");
  try {
    await Page({
      params: Promise.resolve({ locale: "vi", tenant: "t1", classId }),
    });
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

describe("legacy /teacher/classes/[classId]/students", () => {
  it("308-redirects to the class hub students tab", async () => {
    const result = await renderPage();
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/t/t1/teacher/classes/cls-10a1?tab=students");
    expect(result.status).toBe("308");
  });

  it("keeps the requested class id (no hardcoded target)", async () => {
    const result = await renderPage("cls-11b2");
    expect(result.url).toBe("/vi/t/t1/teacher/classes/cls-11b2?tab=students");
  });
});
