import { describe, expect, it, vi } from "vitest";
import type { AcademicRecord } from "../entities/academic-record.entity";
import type {
  AcademicRecordResult,
  AcademicYearListResult,
  IAcademicRecordsRepository,
} from "../repositories/i-academic-records.repository";
import { GetAcademicRecordUseCase } from "./get-academic-record.use-case";

const SAMPLE: AcademicRecord = {
  studentId: "std-001",
  studentName: "Nguyễn Minh Khoa",
  studentCode: "NDU-2009-0184",
  dateOfBirth: null,
  currentClassId: null,
  currentSchoolYear: "2025-2026",
  years: [],
  sealed: false,
  sealedAt: null,
  sealedBy: null,
};

function makeRepo(
  record: AcademicRecordResult,
  years: AcademicYearListResult = { ok: true, data: [] },
): IAcademicRecordsRepository {
  return {
    getRecord: vi.fn().mockResolvedValue(record),
    listYears: vi.fn().mockResolvedValue(years),
  };
}

describe("GetAcademicRecordUseCase", () => {
  it("returns the record on success", async () => {
    const repo = makeRepo({ ok: true, data: SAMPLE });
    const result = await new GetAcademicRecordUseCase(repo).execute("std-001");
    expect(result).toEqual({ ok: true, data: SAMPLE });
    expect(repo.getRecord).toHaveBeenCalledWith("std-001", undefined);
  });

  it("forwards the yearId argument", async () => {
    const repo = makeRepo({ ok: true, data: SAMPLE });
    await new GetAcademicRecordUseCase(repo).execute("std-001", "2024-2025");
    expect(repo.getRecord).toHaveBeenCalledWith("std-001", "2024-2025");
  });

  it("passes through a repo failure", async () => {
    const repo = makeRepo({ ok: false, error: { type: "not-found" } });
    const result = await new GetAcademicRecordUseCase(repo).execute("nope");
    expect(result).toEqual({ ok: false, error: { type: "not-found" } });
  });

  it("normalizes a thrown error to 'unknown'", async () => {
    const repo: IAcademicRecordsRepository = {
      getRecord: vi.fn().mockRejectedValue(new Error("boom")),
      listYears: vi.fn(),
    };
    const result = await new GetAcademicRecordUseCase(repo).execute("std-001");
    expect(result).toEqual({ ok: false, error: { type: "unknown" } });
  });
});
