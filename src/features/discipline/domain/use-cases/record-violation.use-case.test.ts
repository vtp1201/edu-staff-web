import { describe, expect, it, vi } from "vitest";
import type {
  RecordViolationInput,
  ViolationEntity,
} from "../entities/violation.entity";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";
import { RecordViolationUseCase } from "./record-violation.use-case";

const violation: ViolationEntity = {
  id: "v-1",
  studentId: "s-1",
  studentName: "Trần Văn Bình",
  initials: "TB",
  avatarTone: "teal",
  classId: "11B2",
  className: "11B2",
  type: "late",
  date: "2026-04-29",
  period: 1,
  description: "Vào lớp muộn",
  severity: "low",
  handledBy: "Nguyễn Thị Hương",
  status: "recorded",
};

function makeRepo(
  over: Partial<IDisciplineRepository> = {},
): IDisciplineRepository {
  return {
    getViolations: vi.fn(),
    recordViolation: vi.fn(),
    getConductSummary: vi.fn(),
    overrideConductGrade: vi.fn(),
    getLeaveRequests: vi.fn(),
    approveLeave: vi.fn(),
    rejectLeave: vi.fn(),
    getMyConductSummary: vi.fn(),
    getMyViolations: vi.fn(),
    getMyLeaveRequests: vi.fn(),
    submitLeaveRequest: vi.fn(),
    ...over,
  };
}

const validInput: RecordViolationInput = {
  studentName: "Trần Văn Bình",
  classId: "11B2",
  date: "2026-04-29",
  type: "late",
  severity: "low",
  period: 1,
  description: "Vào lớp muộn",
  notifyParent: false,
};

async function expectFailure(
  fn: () => Promise<unknown>,
  type: DisciplineFailure["type"],
) {
  await expect(fn()).rejects.toMatchObject({ type });
}

describe("RecordViolationUseCase", () => {
  it("records a valid violation via the repo", async () => {
    const recordViolation = vi.fn().mockResolvedValue(violation);
    const useCase = new RecordViolationUseCase(makeRepo({ recordViolation }));

    const res = await useCase.execute(validInput);

    expect(recordViolation).toHaveBeenCalledWith(validInput);
    expect(res.id).toBe("v-1");
  });

  it("rejects with missing-student when student name is blank", async () => {
    const recordViolation = vi.fn();
    const useCase = new RecordViolationUseCase(makeRepo({ recordViolation }));

    await expectFailure(
      () => useCase.execute({ ...validInput, studentName: "  " }),
      "missing-student",
    );
    expect(recordViolation).not.toHaveBeenCalled();
  });

  it("rejects with missing-description when description is blank", async () => {
    const useCase = new RecordViolationUseCase(makeRepo());
    await expectFailure(
      () => useCase.execute({ ...validInput, description: "" }),
      "missing-description",
    );
  });

  it("rejects with invalid-severity when severity is not in the union", async () => {
    const useCase = new RecordViolationUseCase(makeRepo());
    await expectFailure(
      () =>
        useCase.execute({
          ...validInput,
          // biome-ignore lint/suspicious/noExplicitAny: testing runtime guard
          severity: "critical" as any,
        }),
      "invalid-severity",
    );
  });
});
