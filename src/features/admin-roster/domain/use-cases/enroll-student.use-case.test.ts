import { describe, expect, it, vi } from "vitest";
import type { SearchStudent } from "../entities/search-student.entity";
import type {
  IRosterRepository,
  Result,
  VoidResult,
} from "../repositories/i-roster.repository";
import { enrollStudent } from "./enroll-student.use-case";

function makeRepo(
  overrides: Partial<IRosterRepository> = {},
): IRosterRepository {
  return {
    getClasses: vi.fn(),
    getClassRoster: vi.fn(),
    getSearchPool: vi.fn(),
    enrollStudent: vi.fn(
      async (): Promise<VoidResult> => ({ ok: true, data: undefined }),
    ),
    unenrollStudent: vi.fn(),
    unenrollStudents: vi.fn(),
    transferStudent: vi.fn(
      async (): Promise<VoidResult> => ({ ok: true, data: undefined }),
    ),
    ...overrides,
  };
}

const unassigned: SearchStudent = {
  id: "HS25201",
  name: "Nguyễn Hồng Quân",
  currentClassId: null,
  currentClassName: null,
};
const inOtherClass: SearchStudent = {
  id: "HS25202",
  name: "Trần Thuỵ Vân",
  currentClassId: "cls-10a2",
  currentClassName: "10A2",
};

describe("enrollStudent use-case", () => {
  it("enrolls an unassigned student — ok, no transfer warning", async () => {
    const repo = makeRepo();
    const result = await enrollStudent(repo, "cls-10a1", unassigned);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.transferWarning).toBeNull();
    }
    expect(repo.enrollStudent).toHaveBeenCalledWith("cls-10a1", "HS25201");
    expect(repo.transferStudent).not.toHaveBeenCalled();
  });

  it("enrolls a student already in another class — ok + transferWarning", async () => {
    const repo = makeRepo();
    const result = await enrollStudent(repo, "cls-10a1", inOtherClass);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.transferWarning).toEqual({ fromClassName: "10A2" });
    }
    expect(repo.transferStudent).toHaveBeenCalledWith(
      "HS25202",
      "cls-10a2",
      "cls-10a1",
    );
    expect(repo.enrollStudent).not.toHaveBeenCalled();
  });

  it("propagates a repository failure", async () => {
    const repo = makeRepo({
      enrollStudent: vi.fn(
        async (): Promise<VoidResult> => ({
          ok: false,
          error: { type: "network-error" },
        }),
      ),
    });
    const result = await enrollStudent(repo, "cls-10a1", unassigned);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("network-error");
    }
  });
});

// Type-only guard to keep Result import meaningful in this file.
const _typecheck: Result<number> = { ok: true, data: 1 };
void _typecheck;
