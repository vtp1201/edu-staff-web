import { beforeEach, describe, expect, it } from "vitest";
import type { PrincipalReportsFailure } from "@/features/principal/domain/reports/failures/principal-reports.failure";
import {
  GENERATE_DELAY_MS,
  MockPrincipalReportsRepository,
  resetMockPrincipalReports,
} from "./mock-principal-reports.repository";

beforeEach(() => {
  resetMockPrincipalReports();
});

describe("MockPrincipalReportsRepository — anti-demo (AC-05.3)", () => {
  it("resolves every read on a fresh instance with NO configuration, 3x in a row, never rejects", async () => {
    const repo = new MockPrincipalReportsRepository();
    for (let i = 0; i < 3; i++) {
      await expect(repo.getReportsSummary("HK2")).resolves.toBeDefined();
      await expect(repo.getSubjectAverages("HK2")).resolves.toBeDefined();
      await expect(repo.getAttendanceTrend("HK2")).resolves.toBeDefined();
      await expect(repo.getPeriodicReports("HK2")).resolves.toBeDefined();
    }
  });

  it("forceNextFailure makes EXACTLY the next call reject, then reverts to success (failure requires explicit opt-in — no hidden default)", async () => {
    const repo = new MockPrincipalReportsRepository();
    // No forcing yet → succeeds.
    await expect(repo.getReportsSummary("HK1")).resolves.toBeDefined();

    repo.forceNextFailure("getReportsSummary", { type: "network-error" });
    await expect(repo.getReportsSummary("HK1")).rejects.toEqual({
      type: "network-error",
    } satisfies PrincipalReportsFailure);

    // The one-shot failure is spent — the very next call succeeds again.
    await expect(repo.getReportsSummary("HK1")).resolves.toBeDefined();
  });
});

describe("MockPrincipalReportsRepository — reads", () => {
  it("returns term-scoped summary/subjects/weeks", async () => {
    const repo = new MockPrincipalReportsRepository();
    const summary = await repo.getReportsSummary("HK1");
    expect(summary.totalStudents).toBeGreaterThan(0);
    // HK1 is the first term → no prior baseline.
    expect(summary.schoolAverageTrend).toBeNull();

    const subjects = await repo.getSubjectAverages("HK2");
    expect(subjects.length).toBeGreaterThan(0);

    const weeks = await repo.getAttendanceTrend("HK2");
    expect(weeks).toHaveLength(6);
  });

  it("returns an empty periodic-reports page for a term with no reports (FR-007)", async () => {
    const repo = new MockPrincipalReportsRepository();
    const page = await repo.getPeriodicReports("FULL_YEAR");
    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });
});

describe("MockPrincipalReportsRepository — generate + poll transition (injected clock)", () => {
  it("generateReport returns a new row with status 'generating'", async () => {
    const repo = new MockPrincipalReportsRepository({ now: () => 1000 });
    const row = await repo.generateReport("HK2");
    expect(row.status).toBe("generating");
    expect(row.term).toBe("HK2");
  });

  it("flips a 'generating' row to 'ready' once the injected clock passes readyAt, stays 'generating' before that", async () => {
    let clock = 0;
    const repo = new MockPrincipalReportsRepository({ now: () => clock });
    const row = await repo.generateReport("HK2");

    // Before readyAt: still generating.
    clock = GENERATE_DELAY_MS - 1;
    let page = await repo.getPeriodicReports("HK2");
    expect(page.items.find((r) => r.id === row.id)?.status).toBe("generating");

    // After readyAt: flipped to ready.
    clock = GENERATE_DELAY_MS + 1;
    page = await repo.getPeriodicReports("HK2");
    expect(page.items.find((r) => r.id === row.id)?.status).toBe("ready");
  });

  it("two 'generating' rows each transition independently once their own readyAt passes (AC-07.4)", async () => {
    let clock = 0;
    const repo = new MockPrincipalReportsRepository({ now: () => clock });
    const a = await repo.generateReport("HK2");
    clock = 100;
    const b = await repo.generateReport("HK2");

    // a.readyAt = GENERATE_DELAY_MS, b.readyAt = 100 + GENERATE_DELAY_MS.
    clock = GENERATE_DELAY_MS + 1; // past a, before b
    let page = await repo.getPeriodicReports("HK2");
    expect(page.items.find((r) => r.id === a.id)?.status).toBe("ready");
    expect(page.items.find((r) => r.id === b.id)?.status).toBe("generating");

    clock = 100 + GENERATE_DELAY_MS + 1; // past b too
    page = await repo.getPeriodicReports("HK2");
    expect(page.items.find((r) => r.id === b.id)?.status).toBe("ready");
  });

  it("generateReport rejection (forceNextFailure) adds NO row to the list (AC-07.3 — no ghost row)", async () => {
    const repo = new MockPrincipalReportsRepository();
    const before = (await repo.getPeriodicReports("HK2")).items.length;

    repo.forceNextFailure("generateReport", { type: "generation-failed" });
    await expect(repo.generateReport("HK2")).rejects.toEqual({
      type: "generation-failed",
    } satisfies PrincipalReportsFailure);

    const after = (await repo.getPeriodicReports("HK2")).items.length;
    expect(after).toBe(before);
  });
});
