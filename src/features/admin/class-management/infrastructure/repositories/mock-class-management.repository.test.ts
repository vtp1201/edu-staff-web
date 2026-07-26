/**
 * Unit tests — MockClassManagementRepository.listClasses (US-E13.8).
 * The mock is the permanent data source for `(app)/principal/classes` (see
 * `bootstrap/di/principal-classes.di.ts`), so its `listClasses` contract —
 * academicYear/gradeLevel/limit handling — is proof-worthy, not incidental.
 */
import { describe, expect, it } from "vitest";
import { MockClassManagementRepository } from "./mock-class-management.repository";

describe("MockClassManagementRepository — listClasses", () => {
  it("returns every seeded class when no filter is supplied", async () => {
    const repo = new MockClassManagementRepository();
    const res = await repo.listClasses({});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.data.length).toBeGreaterThan(0);
      expect(res.value.hasMore).toBe(false);
      expect(res.value.nextCursor).toBeNull();
    }
  });

  it("filters by academicYear", async () => {
    const repo = new MockClassManagementRepository();
    const res = await repo.listClasses({ academicYear: "2025-2026" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.data.length).toBeGreaterThan(0);
      for (const c of res.value.data) {
        expect(c.academicYear).toBe("2025-2026");
      }
    }
  });

  it("slices the result to `limit` when the caller supplies one", async () => {
    const repo = new MockClassManagementRepository();
    const res = await repo.listClasses({ limit: 2 });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.data).toHaveLength(2);
  });

  it("ignores an over-sized limit (no padding, no error)", async () => {
    const repo = new MockClassManagementRepository();
    const all = await repo.listClasses({});
    const limited = await repo.listClasses({ limit: 100 });
    expect(all.ok && limited.ok).toBe(true);
    if (all.ok && limited.ok) {
      expect(limited.value.data).toHaveLength(all.value.data.length);
    }
  });
});
