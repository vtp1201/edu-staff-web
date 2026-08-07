import { describe, expect, it, vi } from "vitest";
import type { AcademicRecord } from "../entities/academic-record.entity";
import type {
  AcademicRecordResult,
  IAcademicRecordsRepository,
} from "../repositories/i-academic-records.repository";
import { GetAcademicRecordUseCase } from "./get-academic-record.use-case";

const SAMPLE: AcademicRecord = {
  studentMemberId: "stu-001",
  years: [],
  sealed: false,
};

function makeRepo(record: AcademicRecordResult): IAcademicRecordsRepository {
  return { getRecords: vi.fn().mockResolvedValue(record) };
}

describe("GetAcademicRecordUseCase", () => {
  it("returns the record on success", async () => {
    const repo = makeRepo({ ok: true, data: SAMPLE });
    const result = await new GetAcademicRecordUseCase(repo).execute("stu-001");
    expect(result).toEqual({ ok: true, data: SAMPLE });
    expect(repo.getRecords).toHaveBeenCalledWith("stu-001");
  });

  it("passes through a repo failure", async () => {
    const repo = makeRepo({ ok: false, error: { type: "not-found" } });
    const result = await new GetAcademicRecordUseCase(repo).execute("nope");
    expect(result).toEqual({ ok: false, error: { type: "not-found" } });
  });

  it("normalizes a thrown error to 'unknown'", async () => {
    const repo: IAcademicRecordsRepository = {
      getRecords: vi.fn().mockRejectedValue(new Error("boom")),
    };
    const result = await new GetAcademicRecordUseCase(repo).execute("stu-001");
    expect(result).toEqual({ ok: false, error: { type: "unknown" } });
  });
});
