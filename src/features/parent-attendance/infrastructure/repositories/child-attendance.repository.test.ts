/**
 * Integration tests — `ChildAttendanceRepository` ↔ HTTP boundary (US-E18.34).
 *
 * This un-mocks US-E20.5. The endpoint
 * `GET /core/api/v1/members/{memberId}/attendance` genuinely authorizes a
 * PARENT reading a LINKED child, and has since US-047 — ground-truthed against
 * `edu-api/services/core/internal/attendance/core/application/usecase/
 * get_student_attendance.go` `authorize()` (`LinkReader.IsLinked`), NOT against
 * the openapi summary, whose "STUDENT-self or ADMIN" prose is stale.
 *
 * The security-relevant assertion here is the failure mapping: a parent who is
 * NOT linked to the requested child gets `403 ATTENDANCE_FORBIDDEN`
 * (`domainerror.ErrAttendanceForbidden()` → `apperror.New(403,
 * "attendance_forbidden")` → `codeFromKey` upper-cases the i18n key), and that
 * must surface as the typed `forbidden` failure — branch on `error.code`, never
 * on `message` (`.claude/rules/api-integration.md`).
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { PARENT_ATTENDANCE_EP } from "@/bootstrap/endpoint/parent-attendance.endpoint";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { ParentAttendanceFailure } from "../../domain/failures/parent-attendance.failure";
import { ChildAttendanceRepository } from "./child-attendance.repository";

function makeHttp(get: ReturnType<typeof vi.fn>) {
  return { get } as unknown as AxiosInstance;
}

function apiError(code: string, status: number, retryable = false) {
  return new ApiError({ code, message: `wire: ${code}`, retryable, status });
}

const RANGE = { startDate: "2026-08-01", endDate: "2026-08-31" };

/** Exactly the payload the interceptor hands a repository (envelope already
 *  unwrapped to `data`), in the BE's own camelCase + UPPER_SNAKE vocabulary. */
const PAYLOAD = {
  memberId: "st-1",
  records: [
    { date: "2026-08-04", classId: "cls-11a2", status: "LATE" },
    { date: "2026-08-03", classId: "cls-11a2", status: "PRESENT" },
    { date: "2026-08-05", classId: "cls-11a2", status: "EXCUSED_ABSENT" },
    { date: "2026-08-06", classId: "cls-11a2", status: "ABSENT" },
  ],
};

describe("ChildAttendanceRepository.getChildAttendance", () => {
  it("GETs the member-scoped endpoint with the inclusive date range as query params", async () => {
    const get = vi.fn().mockResolvedValue(PAYLOAD);

    await new ChildAttendanceRepository(makeHttp(get)).getChildAttendance(
      "st-1",
      RANGE,
    );

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(
      PARENT_ATTENDANCE_EP.memberAttendance("st-1"),
      { params: { startDate: "2026-08-01", endDate: "2026-08-31" } },
    );
    // the child id must reach the PATH, not a body/filter the BE ignores
    expect(get.mock.calls[0][0]).toContain("st-1");
  });

  it("unwraps the envelope payload straight into domain records (camelCase in, domain casing out, sorted)", async () => {
    const get = vi.fn().mockResolvedValue(PAYLOAD);

    const records = await new ChildAttendanceRepository(
      makeHttp(get),
    ).getChildAttendance("st-1", RANGE);

    // `.data` is NOT read — the interceptor already unwrapped it.
    expect(records).toEqual([
      { date: "2026-08-03", status: "present" },
      { date: "2026-08-04", status: "late" },
      { date: "2026-08-05", status: "excusedAbsent" },
      { date: "2026-08-06", status: "absent" },
    ]);
    expect(Object.keys(records[0]).sort()).toEqual(["date", "status"]);
  });

  it("maps an empty range (no school days recorded) to an empty list, not a failure", async () => {
    const get = vi.fn().mockResolvedValue({ memberId: "st-1", records: [] });

    await expect(
      new ChildAttendanceRepository(makeHttp(get)).getChildAttendance(
        "st-1",
        RANGE,
      ),
    ).resolves.toEqual([]);
  });

  it("percent-encodes a member id so it cannot escape its path segment", async () => {
    const get = vi.fn().mockResolvedValue({ memberId: "x", records: [] });

    await new ChildAttendanceRepository(makeHttp(get)).getChildAttendance(
      "st 1/../admin",
      RANGE,
    );

    expect(get.mock.calls[0][0]).toBe(
      "/core/api/v1/members/st%201%2F..%2Fadmin/attendance",
    );
  });

  describe("failure mapping (branch on error.code, never on message)", () => {
    const cases: [string, number, ParentAttendanceFailure][] = [
      // a PARENT not linked to this child — the whole point of this story
      ["ATTENDANCE_FORBIDDEN", 403, { type: "forbidden" }],
      ["ATTENDANCE_INVALID_DATE_RANGE", 400, { type: "invalid-date-range" }],
      [
        "ATTENDANCE_DATE_RANGE_TOO_LARGE",
        400,
        { type: "date-range-too-large" },
      ],
      ["NETWORK_ERROR", 0, { type: "network-error" }],
      ["INTERNAL_SERVER_ERROR", 500, { type: "network-error" }],
      // a 400 the client cannot interpret must NOT masquerade as a range error
      ["ATTENDANCE_INVALID_MEMBER_ID", 400, { type: "unknown" }],
      ["SOMETHING_ELSE", 418, { type: "unknown" }],
    ];

    for (const [code, status, failure] of cases) {
      it(`${code} (${status}) → ${failure.type}`, async () => {
        const get = vi.fn().mockRejectedValue(apiError(code, status));

        await expect(
          new ChildAttendanceRepository(makeHttp(get)).getChildAttendance(
            "st-1",
            RANGE,
          ),
        ).rejects.toEqual(failure);
      });
    }

    it("falls back to forbidden on a bare 403 with no recognised code", async () => {
      const get = vi.fn().mockRejectedValue(apiError("FORBIDDEN", 403));

      await expect(
        new ChildAttendanceRepository(makeHttp(get)).getChildAttendance(
          "st-1",
          RANGE,
        ),
      ).rejects.toEqual({ type: "forbidden" });
    });

    /**
     * The interceptor normalises everything into an `ApiError`, so a bare
     * `Error` here is genuinely unclassifiable — `unknown` (same fallback as
     * `grade-book.repository.ts`'s `throwFailure`). Both `unknown` and
     * `network-error` are retryable in `isRetryableFailure`, so the parent
     * still gets a retry control either way.
     */
    it("maps a non-ApiError throw to the unknown fallback — never leaks the raw Error", async () => {
      const get = vi.fn().mockRejectedValue(new Error("socket hang up"));

      await expect(
        new ChildAttendanceRepository(makeHttp(get)).getChildAttendance(
          "st-1",
          RANGE,
        ),
      ).rejects.toEqual({ type: "unknown" });
    });
  });
});
