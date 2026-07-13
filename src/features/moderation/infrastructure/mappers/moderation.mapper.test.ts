import { describe, expect, it } from "vitest";
import type { ReportDetailResponseDto } from "../dtos/report-detail-response.dto";
import type { ReportResponseDto } from "../dtos/report-response.dto";
import { ModerationMapper } from "./moderation.mapper";

const baseRow: ReportResponseDto = {
  reportId: "r-1",
  kind: "post",
  contentId: "c-1",
  contentPreview: "preview",
  authorId: "a-1",
  authorName: "Author",
  reporterId: "rp-1",
  reporterName: "Reporter",
  reason: "spam",
  status: "pending",
  createdAt: "2026-07-10T09:00:00Z",
  duplicateCount: 0,
};

describe("ModerationMapper.toReportEntity", () => {
  it("maps reportId → id and coalesces optional fields to null", () => {
    const entity = ModerationMapper.toReportEntity(baseRow);
    expect(entity.id).toBe("r-1");
    expect(entity.note).toBeNull();
    expect(entity.resolvedBy).toBeNull();
    expect(entity.resolvedAt).toBeNull();
    expect(entity.resolveNote).toBeNull();
    expect(entity.reason).toBe("spam");
  });

  it("preserves present resolved fields", () => {
    const entity = ModerationMapper.toReportEntity({
      ...baseRow,
      status: "dismissed",
      note: "abuse",
      resolvedBy: "Principal",
      resolvedAt: "2026-07-11T10:00:00Z",
      resolveNote: "not a violation",
    });
    expect(entity.status).toBe("dismissed");
    expect(entity.note).toBe("abuse");
    expect(entity.resolvedBy).toBe("Principal");
  });
});

describe("ModerationMapper.toReportDetailEntity", () => {
  it("defaults context/duplicateReports to [] when absent", () => {
    const dto: ReportDetailResponseDto = { ...baseRow, fullContent: "full" };
    const detail = ModerationMapper.toReportDetailEntity(dto);
    expect(detail.fullContent).toBe("full");
    expect(detail.context).toEqual([]);
    expect(detail.duplicateReports).toEqual([]);
  });

  it("maps context items and duplicate refs", () => {
    const dto: ReportDetailResponseDto = {
      ...baseRow,
      fullContent: "full",
      context: [{ authorName: "A", text: "orig post", highlighted: false }],
      duplicateReports: [
        { reportId: "r-2", reporterName: "R2", createdAt: "2026-07-10" },
      ],
    };
    const detail = ModerationMapper.toReportDetailEntity(dto);
    expect(detail.context).toHaveLength(1);
    expect(detail.context[0].text).toBe("orig post");
    expect(detail.duplicateReports[0].reportId).toBe("r-2");
  });
});

describe("ModerationMapper.toAuditEntryEntity", () => {
  it("maps a wire entry and coalesces reason to null", () => {
    const entity = ModerationMapper.toAuditEntryEntity({
      entryId: "e-1",
      actorId: "u-1",
      actorName: "Principal",
      action: "removed",
      contentRef: { kind: "post", contentId: "c-9" },
      timestamp: "2026-07-11T10:00:00Z",
    });
    expect(entity.entryId).toBe("e-1");
    expect(entity.action).toBe("removed");
    expect(entity.contentRef.contentId).toBe("c-9");
    expect(entity.reason).toBeNull();
  });
});
