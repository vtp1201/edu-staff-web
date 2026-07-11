/**
 * Integration tests — ClassManagementRepository (TR-026, US-E06.4 / US-E18.19).
 * The http interceptor unwraps the envelope; repositories receive the payload
 * directly (or the full envelope for `{ raw: true }` list calls) and a
 * normalised ApiError on failure. Mock at that boundary; branch on error.code.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { CLASS_EP } from "@/bootstrap/endpoint/class.endpoint";
import { ApiError, unwrapResponse } from "@/bootstrap/lib/api-envelope";
import type { ClassResponseDto } from "../dtos/class-response.dto";
import { ClassManagementRepository } from "./class-management.repository";

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

function classDto(over: Partial<ClassResponseDto> = {}): ClassResponseDto {
  return {
    id: "cls-10a1",
    name: "10A1",
    gradeLevel: 10,
    status: "ACTIVE",
    academicYear: "2025-2026",
    studentCount: 30,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
    ...over,
  };
}

function listEnvelope<T>(items: T[], hasMore = false) {
  return {
    success: true,
    data: items,
    error: null,
    meta: {
      requestId: "req-test",
      pagination: { nextCursor: hasMore ? "cur-2" : null, hasMore },
    },
  };
}

describe("ClassManagementRepository — listClasses", () => {
  it("maps the paginated envelope + reads pagination", async () => {
    const get = vi.fn().mockResolvedValue(listEnvelope([classDto()], true));
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.listClasses({});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.data).toHaveLength(1);
      expect(res.value.data[0].id).toBe("cls-10a1");
      expect(res.value.hasMore).toBe(true);
      expect(res.value.nextCursor).toBe("cur-2");
    }
  });

  it("passes filters in params and raw at config top-level", async () => {
    const get = vi.fn().mockResolvedValue(listEnvelope([]));
    const repo = new ClassManagementRepository(makeHttp({ get }));
    await repo.listClasses({ academicYear: "2025-2026", gradeLevel: 10 });
    expect(get).toHaveBeenCalledWith(CLASS_EP.classes, {
      params: { academicYear: "2025-2026", gradeLevel: 10 },
      raw: true,
    });
  });

  it("maps a network error → network-error failure", async () => {
    const get = vi
      .fn()
      .mockRejectedValue(
        new ApiError({ code: "NETWORK_ERROR", message: "x", retryable: true }),
      );
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.listClasses({});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("network-error");
  });

  it("maps CLASS_NOT_FOUND (404) → not-found failure", async () => {
    const get = vi.fn().mockRejectedValue(apiError("CLASS_NOT_FOUND", 404));
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.listClasses({});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("not-found");
  });
});

/**
 * Regression guard for `{ raw: true }` config placement. The suite above mocks
 * `http.get` to return an envelope directly, so it cannot catch `raw` being
 * nested inside `params` (isRawCall reads `config.raw` at the TOP level). Here
 * `http.get` runs the REAL `unwrapResponse` interceptor against the config the
 * repo actually passes: if the list call puts `raw` inside `params`, isRawCall
 * returns false → the envelope is unwrapped to its array → the repo's
 * `parseEnvelope(array)` throws UNKNOWN_ERROR → listClasses fails. Passes only
 * when `raw` sits at the top level of the config (sibling of the spread params).
 */
describe("ClassManagementRepository — real interceptor pipeline (raw-flag placement)", () => {
  function interceptedGet(bodyFor: (url: string) => unknown) {
    return vi.fn(
      async (url: string, config?: { params?: unknown; raw?: boolean }) =>
        unwrapResponse({
          data: bodyFor(url),
          config: { url, raw: config?.raw },
        }),
    ) as unknown as AxiosInstance["get"];
  }

  it("listClasses survives the real unwrap (raw top-level, filters kept in params)", async () => {
    const get = interceptedGet(() => listEnvelope([classDto()], true));
    const repo = new ClassManagementRepository(makeHttp({ get }));
    const res = await repo.listClasses({ academicYear: "2025-2026" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.data[0].id).toBe("cls-10a1");
      expect(res.value.hasMore).toBe(true);
    }
  });
});
