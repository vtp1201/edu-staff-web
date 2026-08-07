/**
 * Unit tests — the shared RSC loader all four role routes call (US-E18.54).
 *
 * Two behaviours are load-bearing and easy to regress:
 * 1. the STUDENT route's `"me"` placeholder must be swapped for the token's own
 *    memberId server-side — a literal "me" on the wire would 400/403;
 * 2. year selection is now a CLIENT-SIDE choice over derived groups, and it
 *    must never open on the degraded "unresolved year" bucket while a real year
 *    exists, nor honour a `?year=` that no derived group carries.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
const resolveCurrentMemberId = vi.fn();

vi.mock("@/bootstrap/di/academic-records.di", () => ({
  makeGetAcademicRecordUseCase: async () => ({ execute }),
  resolveCurrentMemberId: () => resolveCurrentMemberId(),
}));

import {
  type AcademicRecord,
  UNRESOLVED_YEAR_ID,
} from "../../domain/entities/academic-record.entity";
import {
  buildAcademicRecordVM,
  SELF_MEMBER_ID,
} from "./build-academic-record-vm";

function year(yearId: string, isCurrent = false) {
  return {
    yearId,
    yearLabel: yearId === UNRESOLVED_YEAR_ID ? null : yearId,
    isCurrent,
    sealStatus: "all_sealed" as const,
    terms: [],
  };
}

function record(years: AcademicRecord["years"]): AcademicRecord {
  return { studentMemberId: "stu-1", years, sealed: true };
}

beforeEach(() => {
  execute.mockReset();
  resolveCurrentMemberId.mockReset();
});

describe("buildAcademicRecordVM", () => {
  it("swaps the student route's placeholder id for the token-derived memberId", async () => {
    resolveCurrentMemberId.mockResolvedValue("stu-real");
    execute.mockResolvedValue({ ok: true, data: record([]) });

    await buildAcademicRecordVM({
      role: "student",
      studentId: SELF_MEMBER_ID,
    });

    expect(execute).toHaveBeenCalledWith("stu-real");
  });

  it("fails closed (forbidden) rather than calling the wire with a literal 'me'", async () => {
    resolveCurrentMemberId.mockResolvedValue(null);

    const vm = await buildAcademicRecordVM({
      role: "student",
      studentId: SELF_MEMBER_ID,
    });

    expect(execute).not.toHaveBeenCalled();
    expect(vm).toMatchObject({ record: null, error: "forbidden" });
  });

  it("passes a route-supplied studentId straight through", async () => {
    execute.mockResolvedValue({ ok: true, data: record([]) });

    await buildAcademicRecordVM({ role: "parent", studentId: "child-7" });

    expect(resolveCurrentMemberId).not.toHaveBeenCalled();
    expect(execute).toHaveBeenCalledWith("child-7");
  });

  it("selects the current year when no ?year= is given", async () => {
    execute.mockResolvedValue({
      ok: true,
      data: record([year("2024-2025"), year("2025-2026", true)]),
    });

    const vm = await buildAcademicRecordVM({
      role: "admin",
      studentId: "stu-1",
    });

    expect(vm.selectedYearId).toBe("2025-2026");
  });

  it("honours a ?year= that exists and IGNORES one that does not", async () => {
    execute.mockResolvedValue({
      ok: true,
      data: record([year("2024-2025"), year("2025-2026", true)]),
    });

    const known = await buildAcademicRecordVM({
      role: "admin",
      studentId: "stu-1",
      year: "2024-2025",
    });
    expect(known.selectedYearId).toBe("2024-2025");

    const bogus = await buildAcademicRecordVM({
      role: "admin",
      studentId: "stu-1",
      year: "1999-2000",
    });
    expect(bogus.selectedYearId).toBe("2025-2026");
  });

  it("never opens on the unresolved-year bucket while a real year exists", async () => {
    execute.mockResolvedValue({
      ok: true,
      data: record([year("2024-2025"), year(UNRESOLVED_YEAR_ID)]),
    });

    const vm = await buildAcademicRecordVM({
      role: "parent",
      studentId: "child-7",
    });

    expect(vm.selectedYearId).toBe("2024-2025");
  });

  it("falls back to the unresolved bucket when it is the only group", async () => {
    execute.mockResolvedValue({
      ok: true,
      data: record([year(UNRESOLVED_YEAR_ID)]),
    });

    const vm = await buildAcademicRecordVM({
      role: "parent",
      studentId: "child-7",
    });

    expect(vm.selectedYearId).toBe(UNRESOLVED_YEAR_ID);
  });

  it("surfaces the failure key without translating it", async () => {
    execute.mockResolvedValue({ ok: false, error: { type: "forbidden" } });

    const vm = await buildAcademicRecordVM({
      role: "teacher",
      studentId: "stu-1",
    });

    expect(vm).toMatchObject({ record: null, error: "forbidden" });
  });
});
