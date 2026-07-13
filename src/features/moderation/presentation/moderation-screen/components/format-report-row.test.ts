import { describe, expect, it } from "vitest";
import type { ReportEntity } from "../../../domain/entities/report.entity";
import {
  formatReportRow,
  formatReportTimestamp,
  reportStatusTone,
} from "./format-report-row";

describe("reportStatusTone", () => {
  it("maps status → tone", () => {
    expect(reportStatusTone("pending")).toBe("warning");
    expect(reportStatusTone("dismissed")).toBe("muted");
    expect(reportStatusTone("removed")).toBe("error");
  });
});

describe("formatReportTimestamp", () => {
  it("formats an ISO timestamp deterministically (UTC)", () => {
    expect(formatReportTimestamp("2026-07-10T09:05:00Z")).toBe(
      "10/07/2026 09:05",
    );
  });

  it("returns the input unchanged for an unparseable value", () => {
    expect(formatReportTimestamp("not-a-date")).toBe("not-a-date");
  });
});

describe("formatReportRow", () => {
  it("precomputes tone + date + duplicate count from an entity", () => {
    const report: ReportEntity = {
      id: "r-1",
      kind: "post",
      contentId: "c-1",
      contentPreview: "preview",
      authorId: "a-1",
      authorName: "Author",
      reporterId: "rp-1",
      reporterName: "Reporter",
      reason: "spam",
      note: null,
      status: "pending",
      createdAt: "2026-07-10T09:05:00Z",
      duplicateCount: 2,
      resolvedBy: null,
      resolvedAt: null,
      resolveNote: null,
    };
    const view = formatReportRow(report);
    expect(view).toMatchObject({
      id: "r-1",
      reason: "spam",
      kind: "post",
      status: "pending",
      statusTone: "warning",
      createdAtLabel: "10/07/2026 09:05",
      duplicateCount: 2,
    });
  });
});
