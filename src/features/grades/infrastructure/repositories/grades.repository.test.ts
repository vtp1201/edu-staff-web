import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import type { GradeEntryResponseDto } from "../dtos/grades-response.dto";
import { GradesRepository } from "./grades.repository";

// The http interceptor unwraps the success envelope (US-E06.1): calls resolve to
// the payload directly and reject with a normalised ApiError.
function apiError(code: string, status: number) {
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

const scheme: AssessmentScheme = {
  subjectId: "subj-1",
  yearLabel: "2025-2026",
  termId: "HK1",
  columns: [{ id: "ck", type: "CK", label: "Cuối kỳ", count: 1, weight: 100 }],
};

const key = {
  classId: "class-1",
  subjectId: "subj-1",
  termId: "HK1",
  academicYearLabel: "2025-2026",
};

const REJECT_PATH =
  "/core/api/v1/classes/class-1/subjects/subj-1/terms/HK1/grades/s1/columns/ck/reject";

function rejectedDto(): GradeEntryResponseDto {
  return {
    classId: "class-1",
    subjectId: "subj-1",
    termId: "HK1",
    studentMemberId: "s1",
    columnId: "ck",
    value: "6",
    status: "DRAFT",
    enteredBy: "teacher-1",
    enteredAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-05T02:00:00Z",
    rejectionReason: "Sai điểm cuối kỳ",
    rejectedBy: "admin-1",
    rejectedAt: "2026-08-05T02:00:00Z",
  };
}

function makeRepo(over: Partial<AxiosInstance> = {}) {
  return new GradesRepository(makeHttp(over), scheme, "ADMIN_APPROVAL");
}

async function failureOf(promise: Promise<unknown>): Promise<GradesFailure> {
  try {
    await promise;
    throw new Error("expected the repository to throw a GradesFailure");
  } catch (err) {
    return err as GradesFailure;
  }
}

describe("GradesRepository.rejectEntry — US-E18.44 (BE US-184)", () => {
  it("POSTs the reject path with the reason body and maps the staff rejection payload", async () => {
    const post = vi.fn().mockResolvedValue(rejectedDto());
    const repo = makeRepo({ post });

    const result = await repo.rejectEntry(key, "s1", "ck", "Sai điểm cuối kỳ");

    expect(post).toHaveBeenCalledWith(REJECT_PATH, {
      reason: "Sai điểm cuối kỳ",
    });
    expect(result).toEqual({
      studentId: "s1",
      columnId: "ck",
      cell: {
        value: 6,
        status: "DRAFT",
        rejection: {
          reason: "Sai điểm cuối kỳ",
          rejectedBy: "admin-1",
          rejectedAt: "2026-08-05T02:00:00Z",
        },
      },
    });
  });

  it("returns the PENDING_APPROVAL → DRAFT transition (no REJECTED state exists)", async () => {
    const post = vi.fn().mockResolvedValue(rejectedDto());
    const repo = makeRepo({ post });

    const result = await repo.rejectEntry(key, "s1", "ck", "Sai điểm");

    expect(result.cell.status).toBe("DRAFT");
  });

  it("maps 409 GRADE_ENTRY_NOT_PENDING_APPROVAL to `not-pending-approval` (not a generic failure)", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(apiError("GRADE_ENTRY_NOT_PENDING_APPROVAL", 409));
    const repo = makeRepo({ post });

    const failure = await failureOf(repo.rejectEntry(key, "s1", "ck", "x"));

    expect(failure).toEqual({ type: "not-pending-approval" });
  });

  it("maps 422 GRADE_REJECTION_REASON_REQUIRED to `rejection-reason-required`", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(apiError("GRADE_REJECTION_REASON_REQUIRED", 422));
    const repo = makeRepo({ post });

    const failure = await failureOf(repo.rejectEntry(key, "s1", "ck", "x"));

    expect(failure).toEqual({ type: "rejection-reason-required" });
  });

  it("maps a 403 (non ADMIN/MANAGER caller) to `forbidden`", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(apiError("GRADE_ENTRY_FORBIDDEN", 403));
    const repo = makeRepo({ post });

    const failure = await failureOf(repo.rejectEntry(key, "s1", "ck", "x"));

    expect(failure).toEqual({ type: "forbidden" });
  });

  it("maps a 5xx to `network-error` (retryable surface)", async () => {
    const post = vi.fn().mockRejectedValue(apiError("INTERNAL_ERROR", 503));
    const repo = makeRepo({ post });

    const failure = await failureOf(repo.rejectEntry(key, "s1", "ck", "x"));

    expect(failure).toEqual({ type: "network-error" });
  });

  it("branches on error.code, never on the message", async () => {
    const post = vi.fn().mockRejectedValue(
      new ApiError({
        code: "GRADE_ENTRY_NOT_PENDING_APPROVAL",
        message: "some unrelated prose that must not be parsed",
        retryable: false,
        status: 409,
      }),
    );
    const repo = makeRepo({ post });

    const failure = await failureOf(repo.rejectEntry(key, "s1", "ck", "x"));

    expect(failure).toEqual({ type: "not-pending-approval" });
  });
});

describe("GradesRepository.getGradeSheet — staff rejection payload on the list read", () => {
  it("surfaces `rejection` on a DRAFT cell that was rejected (teacher sees why)", async () => {
    const get = vi.fn().mockResolvedValue({
      classId: "class-1",
      subjectId: "subj-1",
      termId: "HK1",
      columns: [],
      students: [
        {
          studentMemberId: "s1",
          entries: [rejectedDto()],
          termAverage: "6",
        },
      ],
    });
    const repo = makeRepo({ get });

    const sheet = await repo.getGradeSheet(key);

    expect(sheet.rows[0].scores.ck.rejection).toEqual({
      reason: "Sai điểm cuối kỳ",
      rejectedBy: "admin-1",
      rejectedAt: "2026-08-05T02:00:00Z",
    });
  });
});
