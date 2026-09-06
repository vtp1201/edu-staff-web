import { describe, expect, it, vi } from "vitest";
import type { SubmitMyLeaveRequestInput } from "../entities/leave-request.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";
import { SubmitMyLeaveRequestUseCase } from "./submit-my-leave-request.use-case";

const TODAY = "2026-09-06";

const INPUT: SubmitMyLeaveRequestInput = {
  studentMemberId: "st-1",
  classId: "cls-1",
  startDate: "2026-09-10",
  endDate: "2026-09-12",
  reason: "Khám sức khoẻ định kỳ",
};

function makeRepo() {
  const submitMyLeaveRequest = vi.fn().mockResolvedValue({ id: "lr-1" });
  return {
    repo: { submitMyLeaveRequest } as unknown as IDisciplineRepository,
    submitMyLeaveRequest,
  };
}

const run = (
  input: SubmitMyLeaveRequestInput,
  repo: IDisciplineRepository,
  today = TODAY,
) => new SubmitMyLeaveRequestUseCase(repo).execute(input, today);

describe("SubmitMyLeaveRequestUseCase — happy path", () => {
  it("delegates the input verbatim to the repository", async () => {
    const { repo, submitMyLeaveRequest } = makeRepo();

    await run(INPUT, repo);

    expect(submitMyLeaveRequest).toHaveBeenCalledTimes(1);
    expect(submitMyLeaveRequest).toHaveBeenCalledWith(INPUT);
  });

  it("accepts a same-day single-date request starting today", async () => {
    const { repo } = makeRepo();

    await expect(
      run({ ...INPUT, startDate: TODAY, endDate: TODAY }, repo),
    ).resolves.toBeDefined();
  });

  it("accepts a reason of exactly 500 characters", async () => {
    const { repo } = makeRepo();

    await expect(
      run({ ...INPUT, reason: "x".repeat(500) }, repo),
    ).resolves.toBeDefined();
  });
});

describe("SubmitMyLeaveRequestUseCase — validation refuses BEFORE the wire", () => {
  it("rejects an empty / whitespace-only reason as reason-too-short", async () => {
    const { repo, submitMyLeaveRequest } = makeRepo();

    await expect(run({ ...INPUT, reason: "   " }, repo)).rejects.toEqual({
      type: "reason-too-short",
    });
    expect(submitMyLeaveRequest).not.toHaveBeenCalled();
  });

  /**
   * A DISTINCT key from `reason-too-short`: "say something" and "say less" need
   * different copy, and core enforces `maxLength: 500` with its own 4xx.
   */
  it("rejects a reason over 500 TRIMMED characters as reason-too-long", async () => {
    const { repo, submitMyLeaveRequest } = makeRepo();

    await expect(
      run({ ...INPUT, reason: `  ${"x".repeat(501)}  ` }, repo),
    ).rejects.toEqual({ type: "reason-too-long" });
    expect(submitMyLeaveRequest).not.toHaveBeenCalled();
  });

  it("rejects an inverted range (endDate before startDate)", async () => {
    const { repo, submitMyLeaveRequest } = makeRepo();

    await expect(
      run({ ...INPUT, startDate: "2026-09-12", endDate: "2026-09-10" }, repo),
    ).rejects.toEqual({ type: "invalid-date" });
    expect(submitMyLeaveRequest).not.toHaveBeenCalled();
  });

  it("rejects a start date in the past (clock injected — no real Date)", async () => {
    const { repo, submitMyLeaveRequest } = makeRepo();

    await expect(
      run({ ...INPUT, startDate: "2026-09-05", endDate: "2026-09-12" }, repo),
    ).rejects.toEqual({ type: "invalid-date" });
    expect(submitMyLeaveRequest).not.toHaveBeenCalled();
  });

  it("rejects a malformed date rather than passing it to core", async () => {
    const { repo, submitMyLeaveRequest } = makeRepo();

    await expect(
      run({ ...INPUT, startDate: "10/09/2026" }, repo),
    ).rejects.toEqual({ type: "invalid-date" });
    expect(submitMyLeaveRequest).not.toHaveBeenCalled();
  });

  it("rejects a blank studentMemberId or classId (an unaddressable request)", async () => {
    const { repo, submitMyLeaveRequest } = makeRepo();

    await expect(run({ ...INPUT, studentMemberId: "" }, repo)).rejects.toEqual({
      type: "missing-student",
    });
    await expect(run({ ...INPUT, classId: "" }, repo)).rejects.toEqual({
      type: "student-not-enrolled",
    });
    expect(submitMyLeaveRequest).not.toHaveBeenCalled();
  });
});
