import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { RosterRepository } from "./roster.repository";

// The http interceptor unwraps the envelope (US-E06.1): repo calls resolve to
// the payload directly and reject with a normalised ApiError. Mock at that line.
function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

describe("RosterRepository", () => {
  it("getClasses maps the unwrapped payload to ClassSummary[]", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue([
        {
          id: "cls-10a1",
          name: "10A1",
          gradeLevel: 10,
          homeroomTeacher: "Nguyễn Thị Hương",
          year: "2025–2026",
        },
      ]),
    });
    const repo = new RosterRepository(http);
    const res = await repo.getClasses({});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(1);
      expect(res.data[0].id).toBe("cls-10a1");
    }
  });

  it("getClassRoster maps the unwrapped payload to RosterStudent[]", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue([
        {
          id: "HS1",
          name: "A",
          dob: "01/01/2010",
          gender: "F",
          status: "active",
        },
      ]),
    });
    const repo = new RosterRepository(http);
    const res = await repo.getClassRoster("cls-10a1");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data[0].gender).toBe("F");
  });

  it("maps a 404 ApiError to a not-found failure", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(apiError("CLASS_NOT_FOUND", 404)),
    });
    const repo = new RosterRepository(http);
    const res = await repo.getClassRoster("missing");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("not-found");
  });

  it("maps a 401 ApiError to an unauthorized failure", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(apiError("UNAUTHORIZED", 401)),
    });
    const repo = new RosterRepository(http);
    const res = await repo.getClasses({});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("unauthorized");
  });

  it("enrollStudent posts to the class students path", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const repo = new RosterRepository(makeHttp({ post }));
    const res = await repo.enrollStudent("cls-10a1", "HS25201");
    expect(res.ok).toBe(true);
    expect(post).toHaveBeenCalledWith("/core/classes/cls-10a1/students", {
      studentId: "HS25201",
    });
  });

  it("transferStudent posts fromClassId/toClassId", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const repo = new RosterRepository(makeHttp({ post }));
    const res = await repo.transferStudent("HS25202", "cls-10a2", "cls-10a1");
    expect(res.ok).toBe(true);
    expect(post).toHaveBeenCalledWith("/core/students/HS25202/transfer", {
      fromClassId: "cls-10a2",
      toClassId: "cls-10a1",
    });
  });
});
