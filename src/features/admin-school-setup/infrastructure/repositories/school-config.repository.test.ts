import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { SchoolConfigRepository } from "./school-config.repository";

// The http interceptor unwraps the envelope (US-E06.1): repo calls resolve to
// the payload directly and reject with a normalised ApiError. The repo catches
// and returns a { ok: false, error } result with a mapped SchoolSetupFailure.
function apiError(code: string, status = 400) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

describe("SchoolConfigRepository", () => {
  it("maps SCHOOL_GRADE_LEVEL_RANGE_NARROWING_BLOCKED to narrowing-blocked", async () => {
    const http = makeHttp({
      put: vi
        .fn()
        .mockRejectedValue(
          apiError("SCHOOL_GRADE_LEVEL_RANGE_NARROWING_BLOCKED"),
        ),
    });
    const repo = new SchoolConfigRepository(http);

    const res = await repo.saveGradeLevelRange({ minGrade: 10, maxGrade: 12 });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("narrowing-blocked");
  });

  it("maps SCHOOL_NOT_FOUND to not-found on getConfig", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(apiError("SCHOOL_NOT_FOUND", 404)),
    });
    const repo = new SchoolConfigRepository(http);

    const res = await repo.getConfig();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("not-found");
  });

  it("maps an unknown error code to unknown", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(apiError("WEIRD_CODE")),
    });
    const repo = new SchoolConfigRepository(http);

    const res = await repo.getSetupStatus();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("unknown");
  });

  it("getConfig returns the mapped config payload on the happy path", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue({
        gradeLevelRange: { minGrade: 6, maxGrade: 9 },
        operationalSettings: { gradePublishMode: "SELF_PUBLISH" },
        activeClassCount: 12,
      }),
    });
    const repo = new SchoolConfigRepository(http);

    const res = await repo.getConfig();

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.gradeLevelRange).toEqual({ minGrade: 6, maxGrade: 9 });
      expect(res.data.operationalSettings.gradePublishMode).toBe(
        "SELF_PUBLISH",
      );
      expect(res.data.activeClassCount).toBe(12);
    }
  });

  it("createSchool maps SCHOOL_ALREADY_EXISTS to already-exists", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("SCHOOL_ALREADY_EXISTS", 409)),
    });
    const repo = new SchoolConfigRepository(http);

    const res = await repo.createSchool({ name: "Trường A" });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("already-exists");
  });
});
