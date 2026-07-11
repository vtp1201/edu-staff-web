/**
 * Integration tests — ClassLogRepository (US-E13.3).
 * The http interceptor unwraps the envelope: repos receive payload directly
 * (or the full envelope for `{ raw: true }` list calls) and a normalised
 * ApiError on failure. Assert mapper output, pagination read, and that each
 * error code maps to the correct ClassLogFailure type (branch on code).
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError, unwrapResponse } from "@/bootstrap/lib/api-envelope";
import type { ClassLogFailure } from "../../domain/failures/class-log.failure";
import type { HomeroomEntryResponseDto } from "../dtos/homeroom-entry-response.dto";
import { ClassLogRepository } from "./class-log.repository";

function apiError(code: string, status: number, retryable = false) {
  return new ApiError({ code, message: code, retryable, status });
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

const dto: HomeroomEntryResponseDto = {
  entryId: "e-1",
  classId: "c-1",
  entryDate: "2026-04-29",
  summary: "Đạo hàm",
  notableEvents: "Lớp trật tự",
  status: "DRAFT",
  authorMemberId: "m-1",
  createdAt: "2026-04-29T01:00:00Z",
  updatedAt: "2026-04-29T01:00:00Z",
};

function listEnvelope(items: HomeroomEntryResponseDto[], hasMore = false) {
  return {
    success: true,
    data: { entries: items },
    error: null,
    meta: {
      requestId: "req-test",
      pagination: { nextCursor: hasMore ? "cur-2" : null, hasMore },
    },
  };
}

describe("ClassLogRepository — happy paths", () => {
  it("listEntries maps payload + reads pagination from envelope", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue(listEnvelope([dto], true)),
    });
    const repo = new ClassLogRepository(http);

    const res = await repo.listEntries({ classId: "c-1" });

    expect(res.entries).toHaveLength(1);
    expect(res.entries[0].summary).toBe("Đạo hàm");
    expect(res.entries[0].notableEvents).toBe("Lớp trật tự");
    expect(res.hasMore).toBe(true);
    expect(res.nextCursor).toBe("cur-2");
  });

  it("createEntry posts and returns the mapped entity", async () => {
    const post = vi.fn().mockResolvedValue(dto);
    const repo = new ClassLogRepository(makeHttp({ post }));

    const res = await repo.createEntry("c-1", "2026-04-29", "Đạo hàm", "note");

    expect(post).toHaveBeenCalledWith(
      "/core/api/v1/classes/c-1/homeroom-entries",
      { entryDate: "2026-04-29", summary: "Đạo hàm", notableEvents: "note" },
    );
    expect(res.entryId).toBe("e-1");
    expect(res.status).toBe("DRAFT");
  });

  it("submitEntry posts to the submit endpoint", async () => {
    const post = vi.fn().mockResolvedValue({ ...dto, status: "SUBMITTED" });
    const repo = new ClassLogRepository(makeHttp({ post }));

    const res = await repo.submitEntry("c-1", "e-1");

    expect(post).toHaveBeenCalledWith(
      "/core/api/v1/classes/c-1/homeroom-entries/e-1/submit",
    );
    expect(res.status).toBe("SUBMITTED");
  });

  it("rejectEntry posts reason in body", async () => {
    const post = vi.fn().mockResolvedValue({
      ...dto,
      status: "REJECTED",
      reason: "Thiếu",
    });
    const repo = new ClassLogRepository(makeHttp({ post }));

    await repo.rejectEntry("c-1", "e-1", "Thiếu");

    expect(post).toHaveBeenCalledWith(
      "/core/api/v1/classes/c-1/homeroom-entries/e-1/reject",
      { reason: "Thiếu" },
    );
  });
});

/**
 * Regression guard for `{ raw: true }` config placement. The suites above mock
 * `http.get` to return an envelope directly, so they cannot catch `raw` being
 * nested inside `params` (isRawCall reads `config.raw` at the TOP level). Here
 * `http.get` runs the REAL `unwrapResponse` interceptor against the config the
 * repo actually passes: if the list call puts `raw` inside `params`, isRawCall
 * returns false → the envelope is unwrapped to `{ entries }` → the repo's
 * `parseEnvelope(...)` throws UNKNOWN_ERROR → listEntries throws. Passes only
 * when `raw` sits at the top level of the config (sibling of `params`).
 */
describe("ClassLogRepository — real interceptor pipeline (raw-flag placement)", () => {
  function interceptedGet(bodyFor: (url: string) => unknown) {
    return vi.fn(
      async (url: string, config?: { params?: unknown; raw?: boolean }) =>
        unwrapResponse({
          data: bodyFor(url),
          config: { url, raw: config?.raw },
        }),
    ) as unknown as AxiosInstance["get"];
  }

  it("listEntries survives the real unwrap and reads pagination (raw top-level)", async () => {
    const get = interceptedGet(() => listEnvelope([dto], true));
    const repo = new ClassLogRepository(makeHttp({ get }));
    const res = await repo.listEntries({ classId: "c-1" });
    expect(res.entries).toHaveLength(1);
    expect(res.entries[0].summary).toBe("Đạo hàm");
    expect(res.hasMore).toBe(true);
    expect(res.nextCursor).toBe("cur-2");
  });
});

describe("ClassLogRepository — error-code mapping", () => {
  const cases: Array<[string, number, ClassLogFailure["type"]]> = [
    ["HOMEROOM_ENTRY_NOT_FOUND", 404, "not-found"],
    ["HOMEROOM_ENTRY_ALREADY_SUBMITTED", 409, "already-submitted"],
    ["HOMEROOM_ENTRY_NOT_SUBMITTED", 409, "not-submitted"],
    ["HOMEROOM_ENTRY_DUPLICATE_DATE", 409, "duplicate-date"],
    ["FORBIDDEN", 403, "unauthorized"],
    ["NETWORK_ERROR", 0, "network-error"],
    ["SOMETHING_ELSE", 500, "unknown"],
  ];

  for (const [code, status, expected] of cases) {
    it(`${code} → ${expected}`, async () => {
      const post = vi.fn().mockRejectedValue(apiError(code, status));
      const repo = new ClassLogRepository(makeHttp({ post }));
      try {
        await repo.submitEntry("c-1", "e-1");
        throw new Error("expected throw");
      } catch (err) {
        expect((err as ClassLogFailure).type).toBe(expected);
      }
    });
  }
});
