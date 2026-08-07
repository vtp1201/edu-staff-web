/**
 * Unit tests — the `classId → academicYearLabel` join collaborator (US-E18.54).
 *
 * The academic-record wire has NO year dimension and BE confirmed it never
 * will, so the viewer's year grouping is a client-side join. These tests pin
 * the three properties that keep that join safe: ONE call per DISTINCT class,
 * a hard bound on the fan-out, and fail-SOFT degrade (a 403 on one class must
 * never fail the whole record read — it degrades that class's records into the
 * "unresolved year" bucket).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AxiosInstance } from "axios";
import { studentEnrollmentPath } from "@/bootstrap/endpoint/admin-roster.endpoint";
import {
  MAX_CLASS_YEAR_LOOKUPS,
  makeEnrollmentYearResolver,
} from "./enrollment-year.resolver";

function makeHttp(
  impl: (url: string) => Promise<unknown> = async () => ({
    enrollmentId: "e-1",
    classId: "c-1",
    studentMemberId: "stu-1",
    academicYearLabel: "2025-2026",
    enrolledAt: "2025-09-01T00:00:00Z",
  }),
) {
  const get = vi.fn(impl);
  return { http: { get } as unknown as AxiosInstance, get };
}

describe("makeEnrollmentYearResolver", () => {
  it("performs exactly ONE call per DISTINCT classId", async () => {
    const { http, get } = makeHttp(async (url) => ({
      enrollmentId: "e",
      classId: url,
      studentMemberId: "stu-1",
      academicYearLabel: url.includes("c-9") ? "2024-2025" : "2025-2026",
      enrolledAt: "2025-09-01T00:00:00Z",
    }));

    const resolve = makeEnrollmentYearResolver(http);
    const years = await resolve(["c-9", "c-10", "c-9", "c-10", "c-9"], "stu-1");

    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenCalledWith(studentEnrollmentPath("c-9", "stu-1"));
    expect(get).toHaveBeenCalledWith(studentEnrollmentPath("c-10", "stu-1"));
    expect(years.get("c-9")).toBe("2024-2025");
    expect(years.get("c-10")).toBe("2025-2026");
  });

  it("makes no call at all for an empty class list", async () => {
    const { http, get } = makeHttp();
    const years = await makeEnrollmentYearResolver(http)([], "stu-1");

    expect(get).not.toHaveBeenCalled();
    expect(years.size).toBe(0);
  });

  it("degrades a single failing class instead of failing the whole join", async () => {
    const { http, get } = makeHttp(async (url) => {
      if (url.includes("c-forbidden")) throw new Error("403");
      return {
        enrollmentId: "e",
        classId: "c-ok",
        studentMemberId: "stu-1",
        academicYearLabel: "2025-2026",
        enrolledAt: "2025-09-01T00:00:00Z",
      };
    });

    const years = await makeEnrollmentYearResolver(http)(
      ["c-ok", "c-forbidden"],
      "stu-1",
    );

    expect(get).toHaveBeenCalledTimes(2);
    expect(years.get("c-ok")).toBe("2025-2026");
    expect(years.has("c-forbidden")).toBe(false);
  });

  it("omits a class whose row carries a blank academicYearLabel (never an empty label)", async () => {
    const { http } = makeHttp(async () => ({
      enrollmentId: "e",
      classId: "c-1",
      studentMemberId: "stu-1",
      academicYearLabel: "   ",
      enrolledAt: "2025-09-01T00:00:00Z",
    }));

    const years = await makeEnrollmentYearResolver(http)(["c-1"], "stu-1");
    expect(years.size).toBe(0);
  });

  it("bounds the fan-out — beyond the cap the extra classes stay unresolved rather than storming core", async () => {
    const { http, get } = makeHttp(async () => ({
      enrollmentId: "e",
      classId: "c",
      studentMemberId: "stu-1",
      academicYearLabel: "2025-2026",
      enrolledAt: "2025-09-01T00:00:00Z",
    }));
    const classIds = Array.from(
      { length: MAX_CLASS_YEAR_LOOKUPS + 5 },
      (_, i) => `c-${i}`,
    );

    const years = await makeEnrollmentYearResolver(http)(classIds, "stu-1");

    expect(get).toHaveBeenCalledTimes(MAX_CLASS_YEAR_LOOKUPS);
    expect(years.size).toBe(MAX_CLASS_YEAR_LOOKUPS);
  });
});
