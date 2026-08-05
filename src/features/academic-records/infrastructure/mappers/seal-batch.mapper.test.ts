/**
 * Unit tests — `sealedStudentMapper` (US-E18.43, BE US-183).
 *
 * The real `SealedStudentResponse` is KEY-LESS (`{studentMemberId, sealedAt,
 * sealedBy, resealCount}`): the class/term/year are implied by the request path,
 * and there is no display name on the wire. Both are re-attached here — the key
 * from the caller (same precedent as `sealStatusRollupMapper`), the name from an
 * IAM batch lookup with a raw-id fallback.
 */
import { describe, expect, it } from "vitest";
import type { SealBatchKey } from "../../domain/entities/seal-batch.entity";
import type { SealedStudentListItemDto } from "../dtos/seal-response.dto";
import { sealedStudentMapper } from "./seal-batch.mapper";

const KEY: SealBatchKey = { classId: "12C1", term: "HK1", year: "2025-2026" };

function dto(
  over: Partial<SealedStudentListItemDto> = {},
): SealedStudentListItemDto {
  return {
    studentMemberId: "member-uuid-1",
    sealedAt: "2026-01-15T14:32:00.000Z",
    sealedBy: "admin-uuid-1",
    resealCount: 0,
    ...over,
  };
}

describe("sealedStudentMapper", () => {
  it("renames studentMemberId → studentId and re-attaches the caller's key", () => {
    const option = sealedStudentMapper(dto(), KEY, new Map());

    expect(option.studentId).toBe("member-uuid-1");
    expect(option.classId).toBe("12C1");
    expect(option.term).toBe("HK1");
    expect(option.year).toBe("2025-2026");
    expect(option.sealedAt).toBe("2026-01-15T14:32:00.000Z");
  });

  it("resolves studentName from the batch-lookup map", () => {
    const option = sealedStudentMapper(
      dto(),
      KEY,
      new Map([["member-uuid-1", "Lê Hoàng Nhật"]]),
    );

    expect(option.studentName).toBe("Lê Hoàng Nhật");
  });

  it("degrades an unresolved name to the raw member id (never an error)", () => {
    const option = sealedStudentMapper(dto(), KEY, new Map());

    expect(option.studentName).toBe("member-uuid-1");
  });

  it("keeps a nullable wire sealedAt as null (the picker hides its date hint)", () => {
    const option = sealedStudentMapper(dto({ sealedAt: null }), KEY, new Map());

    expect(option.sealedAt).toBeNull();
  });

  it("produces exactly the SealedStudentOption key set (no wire leakage)", () => {
    const option = sealedStudentMapper(
      dto({ sealedBy: "admin-uuid-1", resealCount: 3 }),
      KEY,
      new Map(),
    );

    expect(Object.keys(option).sort()).toEqual([
      "classId",
      "sealedAt",
      "studentId",
      "studentName",
      "term",
      "year",
    ]);
  });
});
