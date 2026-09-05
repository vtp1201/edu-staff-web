import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { CLASS_EP } from "@/bootstrap/endpoint/class.endpoint";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { ClassSubjectsRepository } from "./class-subjects.repository";

/**
 * The ONE `core` read this feature makes (US-E24.10) — the GVCN subject picker.
 *
 * What this file exists to pin down is the WIRE SHAPE, because it is not the
 * obvious one: `GET /classes/{classId}/subjects` answers a CURSOR-PAGINATED
 * `ClassSubjectSummaryResponse[]` whose display name sits on a nested
 * `lockedFields` object. Reading a flat `subjectName` (or forgetting the
 * cursor) yields a picker of `undefined` labels that still type-checks.
 */
function envelope(
  rows: unknown[],
  pagination?: { nextCursor: string | null; hasMore: boolean },
) {
  return {
    success: true,
    data: rows,
    error: null,
    meta: { requestId: "r1", timestamp: "2026-09-05T00:00:00Z", pagination },
  };
}

function row(over: Record<string, unknown> = {}) {
  return {
    classSubjectId: "cs-1",
    classId: "cl-1",
    subjectId: "sub-toan",
    status: "ACTIVE",
    lockedFields: { subjectName: "Toán 10" },
    ...over,
  };
}

function makeHttp(get: ReturnType<typeof vi.fn>): AxiosInstance {
  return { get } as unknown as AxiosInstance;
}

describe("ClassSubjectsRepository.listClassSubjects", () => {
  it("reads the nested lockedFields.subjectName, not a flat one", async () => {
    const get = vi.fn(async () => envelope([row()]));

    const rows = await new ClassSubjectsRepository(
      makeHttp(get),
    ).listClassSubjects("cl-1");

    expect(rows).toEqual([{ subjectId: "sub-toan", subjectName: "Toán 10" }]);
    expect(get).toHaveBeenCalledWith(
      CLASS_EP.classSubjects("cl-1"),
      expect.objectContaining({ raw: true }),
    );
  });

  it("follows the cursor to the end — a picker must not hide page 2", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(
        envelope([row()], { nextCursor: "c2", hasMore: true }),
      )
      .mockResolvedValueOnce(
        envelope(
          [
            row({
              classSubjectId: "cs-2",
              subjectId: "sub-ly",
              lockedFields: { subjectName: "Vật lý 10" },
            }),
          ],
          { nextCursor: null, hasMore: false },
        ),
      );

    const rows = await new ClassSubjectsRepository(
      makeHttp(get),
    ).listClassSubjects("cl-1");

    expect(rows.map((r) => r.subjectId)).toEqual(["sub-toan", "sub-ly"]);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[1]?.[1]).toMatchObject({
      params: expect.objectContaining({ cursor: "c2" }),
    });
  });

  it("keeps one option per subject — a repeat would crash the picker's keys", async () => {
    const get = vi.fn(async () =>
      envelope([row(), row({ classSubjectId: "cs-dup" })]),
    );

    const rows = await new ClassSubjectsRepository(
      makeHttp(get),
    ).listClassSubjects("cl-1");

    expect(rows).toHaveLength(1);
  });

  it("drops ARCHIVED offerings — an archived subject is not selectable", async () => {
    // The status field is on the wire for a reason: an ARCHIVED offering is a
    // subject the class no longer teaches. Listing it would let a GVCN open a
    // course that BE will refuse (or worse, silently accept a write against a
    // dead offering).
    const get = vi.fn(async () =>
      envelope([
        row({ status: "ARCHIVED" }),
        row({
          classSubjectId: "cs-2",
          subjectId: "sub-ly",
          lockedFields: { subjectName: "Vật lý 10" },
        }),
      ]),
    );

    const rows = await new ClassSubjectsRepository(
      makeHttp(get),
    ).listClassSubjects("cl-1");

    expect(rows).toEqual([{ subjectId: "sub-ly", subjectName: "Vật lý 10" }]);
  });

  it("still offers a subject whose ARCHIVED row precedes an ACTIVE one", async () => {
    // The dedupe set must not be poisoned by the skipped row: a subject
    // re-offered in a new academic year keeps an old ARCHIVED row alongside
    // the live one.
    const get = vi.fn(async () =>
      envelope([
        row({ classSubjectId: "cs-old", status: "ARCHIVED" }),
        row({ classSubjectId: "cs-new" }),
      ]),
    );

    const rows = await new ClassSubjectsRepository(
      makeHttp(get),
    ).listClassSubjects("cl-1");

    expect(rows).toEqual([{ subjectId: "sub-toan", subjectName: "Toán 10" }]);
  });

  it("falls back to the id when BE sends a blank name (never a blank option)", async () => {
    const get = vi.fn(async () =>
      envelope([row({ lockedFields: { subjectName: "  " } })]),
    );

    const rows = await new ClassSubjectsRepository(
      makeHttp(get),
    ).listClassSubjects("cl-1");

    expect(rows[0]?.subjectName).toBe("sub-toan");
  });

  it("maps a denial to the feature's own failure union, not a raw ApiError", async () => {
    const get = vi.fn(async () => {
      throw new ApiError({
        code: "UNAUTHORIZED_ACCESS",
        message: "nope",
        retryable: false,
        status: 403,
      });
    });

    await expect(
      new ClassSubjectsRepository(makeHttp(get)).listClassSubjects("cl-1"),
    ).rejects.toEqual({ type: "forbidden" });
  });
});
