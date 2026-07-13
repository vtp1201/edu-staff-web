import { describe, expect, it } from "vitest";
import type { ReportListItemEntity } from "@/features/principal/domain/reports/entities/report-list-item.entity";
import { getReportsPollInterval, POLL_INTERVAL_MS } from "./reports-poll";

function row(status: "ready" | "generating"): ReportListItemEntity {
  return {
    id: `r-${status}`,
    name: "Báo cáo",
    term: "HK2",
    createdAt: "2026-07-13T00:00:00.000Z",
    status,
  };
}

describe("getReportsPollInterval", () => {
  it("returns the poll interval when at least one row is generating", () => {
    expect(getReportsPollInterval([row("ready"), row("generating")])).toBe(
      POLL_INTERVAL_MS,
    );
  });

  it("returns false when all rows are ready", () => {
    expect(getReportsPollInterval([row("ready"), row("ready")])).toBe(false);
  });

  it("returns false for an empty list", () => {
    expect(getReportsPollInterval([])).toBe(false);
  });

  it("returns false for undefined (no data yet)", () => {
    expect(getReportsPollInterval(undefined)).toBe(false);
  });
});
