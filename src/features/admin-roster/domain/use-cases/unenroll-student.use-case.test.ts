import { describe, expect, it, vi } from "vitest";
import type {
  IRosterRepository,
  VoidResult,
} from "../repositories/i-roster.repository";
import { unenrollStudent } from "./unenroll-student.use-case";

function makeRepo(result: VoidResult): IRosterRepository {
  return {
    getClasses: vi.fn(),
    getClassRoster: vi.fn(),
    getSearchPool: vi.fn(),
    enrollStudent: vi.fn(),
    unenrollStudent: vi.fn(async (): Promise<VoidResult> => result),
    unenrollStudents: vi.fn(),
    transferStudent: vi.fn(),
  };
}

describe("unenrollStudent use-case", () => {
  it("unenrolls an existing student — ok", async () => {
    const repo = makeRepo({ ok: true, data: undefined });
    const result = await unenrollStudent(repo, "cls-10a1", "HS25001");
    expect(result.ok).toBe(true);
    expect(repo.unenrollStudent).toHaveBeenCalledWith("cls-10a1", "HS25001");
  });

  it("propagates a not-found failure", async () => {
    const repo = makeRepo({ ok: false, error: { type: "not-found" } });
    const result = await unenrollStudent(repo, "cls-10a1", "HS-missing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("not-found");
    }
  });
});
