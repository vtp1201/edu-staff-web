/**
 * Unit tests — principal classes Server Action (US-E13.8).
 * `loadMoreClassesAction` is the cursor-pagination boundary (FR-007): it calls
 * the principal-scoped repository facade with an explicit `limit: 100` and maps
 * a failure to a stable `errorKey` WITHOUT translating (i18n.md — presentation
 * translates). The DI facade is mocked at the module boundary.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import {
  fail,
  ok,
} from "@/features/admin/class-management/domain/use-cases/result";

const listClasses = vi.fn();

vi.mock("@/bootstrap/di/principal-classes.di", () => ({
  makePrincipalClassesRepository: vi.fn(async () => ({ listClasses })),
}));

import { loadMoreClassesAction } from "./actions";

const ROW: Class = {
  id: "c-11b2",
  name: "11B2",
  gradeLevel: 11,
  status: "ACTIVE",
  academicYear: "2025-2026",
  studentCount: 27,
  homeroomTeacherId: "u-teacher-9",
  homeroomTeacherName: "Đỗ Thị Mai",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadMoreClassesAction", () => {
  it("calls the facade with academicYear, cursor and an explicit limit of 100", async () => {
    listClasses.mockResolvedValue(
      ok({ data: [ROW], nextCursor: null, hasMore: false }),
    );
    await loadMoreClassesAction("2025-2026", "cur-2");
    expect(listClasses).toHaveBeenCalledWith({
      academicYear: "2025-2026",
      cursor: "cur-2",
      limit: 100,
    });
  });

  it("returns the next page on success", async () => {
    listClasses.mockResolvedValue(
      ok({ data: [ROW], nextCursor: "cur-3", hasMore: true }),
    );
    const res = await loadMoreClassesAction("2025-2026", "cur-2");
    expect(res).toEqual({
      ok: true,
      data: { data: [ROW], nextCursor: "cur-3", hasMore: true },
    });
  });

  it("maps a network-error failure to { ok: false, errorKey } without translating", async () => {
    listClasses.mockResolvedValue(fail({ type: "network-error" }));
    const res = await loadMoreClassesAction("2025-2026", "cur-2");
    expect(res).toEqual({ ok: false, errorKey: "network-error" });
  });

  it("maps a forbidden failure to its own stable key", async () => {
    listClasses.mockResolvedValue(fail({ type: "forbidden" }));
    const res = await loadMoreClassesAction("2025-2026", "cur-2");
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
  });
});
