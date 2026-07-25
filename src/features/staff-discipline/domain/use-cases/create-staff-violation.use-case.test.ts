import { describe, expect, it } from "vitest";
import type { CreateStaffViolationInput } from "../entities/staff-violation.entity";
import { CreateStaffViolationUseCase } from "./create-staff-violation.use-case";
import {
  makeRepoMock,
  PRINCIPAL_CTX,
  violation,
} from "./staff-discipline.test-doubles";

const input = (
  over: Partial<CreateStaffViolationInput> = {},
): CreateStaffViolationInput => ({
  staffMemberId: "staff-4",
  category: "late",
  description: "Vào lớp trễ 20 phút không báo trước.",
  severity: "MODERATE",
  occurredAt: "2026-05-04",
  ...over,
});

describe("CreateStaffViolationUseCase (INT-001)", () => {
  it("creates a DRAFT record on valid input (AC-002.3)", async () => {
    const repo = makeRepoMock();
    const created = violation({ state: "DRAFT" });
    repo.createStaffViolation.mockResolvedValue(created);

    const result = await new CreateStaffViolationUseCase(repo).execute(
      input(),
      PRINCIPAL_CTX,
    );

    expect(result.state).toBe("DRAFT");
    expect(repo.createStaffViolation).toHaveBeenCalledWith(
      input(),
      PRINCIPAL_CTX,
    );
  });

  it("rejects an out-of-enum severity without calling the repository (AC-002.4)", async () => {
    const repo = makeRepoMock();

    await expect(
      new CreateStaffViolationUseCase(repo).execute(
        input({ severity: "CRITICAL" as never }),
        PRINCIPAL_CTX,
      ),
    ).rejects.toEqual({ type: "invalid-severity" });
    expect(repo.createStaffViolation).not.toHaveBeenCalled();
  });

  it("rejects a blank description with a field-scoped validation failure (AC-002.5)", async () => {
    const repo = makeRepoMock();

    await expect(
      new CreateStaffViolationUseCase(repo).execute(
        input({ description: "   " }),
        PRINCIPAL_CTX,
      ),
    ).rejects.toEqual({
      type: "validation",
      fields: [{ field: "description", reason: "required" }],
    });
    expect(repo.createStaffViolation).not.toHaveBeenCalled();
  });

  it("rejects a missing staff member (roster select is required)", async () => {
    const repo = makeRepoMock();

    await expect(
      new CreateStaffViolationUseCase(repo).execute(
        input({ staffMemberId: "" }),
        PRINCIPAL_CTX,
      ),
    ).rejects.toEqual({
      type: "validation",
      fields: [{ field: "staffMemberId", reason: "required" }],
    });
  });

  it("propagates a server failure (forbidden backstop, NFR-008)", async () => {
    const repo = makeRepoMock();
    repo.createStaffViolation.mockRejectedValue({ type: "forbidden" });

    await expect(
      new CreateStaffViolationUseCase(repo).execute(input(), PRINCIPAL_CTX),
    ).rejects.toEqual({ type: "forbidden" });
  });
});
