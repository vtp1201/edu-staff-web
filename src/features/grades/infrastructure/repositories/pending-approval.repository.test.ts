import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { type ApiEnvelope, ApiError } from "@/bootstrap/lib/api-envelope";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import type { PendingApprovalBatchListDto } from "../dtos/pending-approval-batch-response.dto";
import { PendingApprovalRepository } from "./pending-approval.repository";

const PATH = "/core/api/v1/grade-entries/pending-approval";

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function envelope(
  items: PendingApprovalBatchListDto["items"],
  pagination?: { nextCursor: string | null; hasMore: boolean },
): ApiEnvelope<PendingApprovalBatchListDto> {
  return {
    success: true,
    data: { items },
    error: null,
    meta: { requestId: "req-1", ...(pagination ? { pagination } : {}) },
  };
}

function makeRepo(get: ReturnType<typeof vi.fn>) {
  return new PendingApprovalRepository({ get } as unknown as AxiosInstance);
}

async function failureOf(promise: Promise<unknown>): Promise<GradesFailure> {
  try {
    await promise;
    throw new Error("expected the repository to throw a GradesFailure");
  } catch (err) {
    return err as GradesFailure;
  }
}

describe("PendingApprovalRepository.listPendingApprovalBatches", () => {
  it("reads the envelope with { raw: true } and unwraps data.items + meta.pagination", async () => {
    const get = vi.fn(async () =>
      envelope(
        [
          {
            classId: "class-1",
            subjectId: "subj-1",
            termId: "HK1",
            pendingCount: 12,
            submittedAt: "2026-08-01T02:00:00Z",
          },
        ],
        { nextCursor: "cur-2", hasMore: true },
      ),
    );

    const page = await makeRepo(get).listPendingApprovalBatches({ limit: 20 });

    expect(page).toEqual({
      items: [
        {
          classId: "class-1",
          subjectId: "subj-1",
          termId: "HK1",
          pendingCount: 12,
          submittedAt: "2026-08-01T02:00:00Z",
        },
      ],
      nextCursor: "cur-2",
      hasMore: true,
    });
    // `raw` is a CONFIG-level sibling of `params` — nesting it inside `params`
    // silently sends it as a query string and leaves the envelope unwrapped.
    expect(get).toHaveBeenCalledWith(PATH, {
      params: { cursor: undefined, limit: 20 },
      raw: true,
    });
  });

  it("treats a missing meta.pagination as the last page", async () => {
    const get = vi.fn(async () => envelope([]));
    const page = await makeRepo(get).listPendingApprovalBatches();
    expect(page).toEqual({ items: [], nextCursor: null, hasMore: false });
  });

  it("sends the cursor for a follow-up page", async () => {
    const get = vi.fn(async () => envelope([]));
    await makeRepo(get).listPendingApprovalBatches({ cursor: "cur-2" });
    expect(get).toHaveBeenCalledWith(PATH, {
      params: { cursor: "cur-2", limit: undefined },
      raw: true,
    });
  });

  it.each([
    ["GRADE_ENTRY_INVALID_CURSOR", 400, "invalid-cursor"],
    ["GRADE_ENTRY_FORBIDDEN", 403, "forbidden"],
    ["SOMETHING_ELSE", 500, "network-error"],
    ["SOMETHING_ELSE", 418, "unknown"],
  ])("maps %s/%i to the %s failure", async (code, status, type) => {
    const get = vi.fn(async () => {
      throw apiError(code, status);
    });
    expect(await failureOf(makeRepo(get).listPendingApprovalBatches())).toEqual(
      { type },
    );
  });

  it("maps a transport failure (no response) to network-error", async () => {
    const get = vi.fn(async () => {
      throw new ApiError({
        code: "NETWORK_ERROR",
        message: "offline",
        retryable: true,
      });
    });
    expect(await failureOf(makeRepo(get).listPendingApprovalBatches())).toEqual(
      { type: "network-error" },
    );
  });

  it("throws the envelope's ApiError code as a failure on a success:false body", async () => {
    const get = vi.fn(async () => ({
      success: false,
      data: null,
      error: {
        code: "GRADE_ENTRY_INVALID_CURSOR",
        message: "bad cursor",
        retryable: false,
      },
      meta: {},
    }));
    expect(
      await failureOf(
        makeRepo(get).listPendingApprovalBatches({ cursor: "nope" }),
      ),
    ).toEqual({ type: "invalid-cursor" });
  });
});
