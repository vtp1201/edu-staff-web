/**
 * Unit tests — principal teachers Server Actions (US-E13.5).
 * Actions translate a use-case Result into a stable { errorKey } shape
 * (i18n happens at presentation). DI factories are mocked at the module boundary.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fail,
  ok,
} from "@/features/admin/class-management/domain/use-cases/result";

const assignHomeroomExecute = vi.fn();
const assignSubjectExecute = vi.fn();

vi.mock("@/bootstrap/di", () => ({
  makeAssignHomeroomTeacherUseCase: vi.fn(async () => ({
    execute: assignHomeroomExecute,
  })),
  makeAssignSubjectTeacherUseCase: vi.fn(async () => ({
    execute: assignSubjectExecute,
  })),
  makeGetClassSubjectsUseCase: vi.fn(),
}));

import {
  assignHomeroomTeacherAction,
  assignSubjectTeacherAction,
} from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("assignHomeroomTeacherAction", () => {
  it("returns { errorKey: null } on success", async () => {
    assignHomeroomExecute.mockResolvedValue(ok(undefined));
    const res = await assignHomeroomTeacherAction("c-10a1", "t-001");
    expect(res).toEqual({ errorKey: null });
  });

  it("returns { errorKey: 'forbidden' } when use-case returns forbidden failure", async () => {
    assignHomeroomExecute.mockResolvedValue(fail({ type: "forbidden" }));
    const res = await assignHomeroomTeacherAction("c-10a1", "t-001");
    expect(res).toEqual({ errorKey: "forbidden" });
  });

  it("returns { errorKey: 'conflict-exists' } when use-case returns conflict-exists failure", async () => {
    assignHomeroomExecute.mockResolvedValue(fail({ type: "conflict-exists" }));
    const res = await assignHomeroomTeacherAction("c-10a1", "t-001");
    expect(res).toEqual({ errorKey: "conflict-exists" });
  });
});

describe("assignSubjectTeacherAction", () => {
  it("returns { errorKey: null } on success", async () => {
    assignSubjectExecute.mockResolvedValue(ok(undefined));
    const res = await assignSubjectTeacherAction("c-10a1", "s-toan", "t-001");
    expect(res).toEqual({ errorKey: null });
  });

  it("returns { errorKey: 'network-error' } on network-error failure", async () => {
    assignSubjectExecute.mockResolvedValue(fail({ type: "network-error" }));
    const res = await assignSubjectTeacherAction("c-10a1", "s-toan", "t-001");
    expect(res).toEqual({ errorKey: "network-error" });
  });
});
