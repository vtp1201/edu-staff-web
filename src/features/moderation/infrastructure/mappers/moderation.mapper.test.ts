import { describe, expect, it } from "vitest";
import type { ReportStatus } from "../../domain/entities/report.entity";
import type { ModerationStatsResponseDto } from "../dtos/moderation-stats-response.dto";
import type { ReportInboxItemDto } from "../dtos/report-response.dto";
import {
  ModerationMapper,
  toWireContentType,
  toWireReasonCategory,
  toWireStatus,
  toWireTargetType,
} from "./moderation.mapper";

const PENDING: ReportInboxItemDto = {
  reportId: "rep-1",
  targetType: "POST",
  targetId: "post-9",
  reasonCategory: "SPAM",
  reasonFreeText: null,
  filedAt: "2026-07-10T08:00:00Z",
  status: "PENDING",
};

describe("ModerationMapper.toReportEntity", () => {
  it("maps the wire row onto the entity (ids, kind, reason, filedAt)", () => {
    expect(ModerationMapper.toReportEntity(PENDING)).toEqual({
      id: "rep-1",
      kind: "post",
      contentId: "post-9",
      contentPreview: null,
      authorId: null,
      authorName: null,
      reporterId: null,
      reporterName: null,
      reason: "spam",
      note: null,
      status: "pending",
      createdAt: "2026-07-10T08:00:00Z",
      duplicateCount: null,
      resolvedBy: null,
      resolvedAt: null,
      resolveNote: null,
    });
  });

  it("NEVER invents a reporter/author/preview — the wire has none (NFR-098-01)", () => {
    const entity = ModerationMapper.toReportEntity(PENDING);
    // A future "helpful" mapping of these would fabricate identity data.
    expect(entity.reporterId).toBeNull();
    expect(entity.reporterName).toBeNull();
    expect(entity.authorId).toBeNull();
    expect(entity.authorName).toBeNull();
    expect(entity.contentPreview).toBeNull();
    expect(entity.duplicateCount).toBeNull();
  });

  it("maps every targetType including COMMENT (US-166/US-172)", () => {
    const kinds = (["MESSAGE", "POST", "COMMENT"] as const).map(
      (targetType) =>
        ModerationMapper.toReportEntity({ ...PENDING, targetType }).kind,
    );
    expect(kinds).toEqual(["message", "post", "comment"]);
  });

  it("maps every reasonCategory to the web vocabulary", () => {
    const pairs: Array<[ReportInboxItemDto["reasonCategory"], string]> = [
      ["HARASSMENT", "bullying"],
      ["INAPPROPRIATE_CONTENT", "inappropriate-language"],
      ["SPAM", "spam"],
      ["MISINFORMATION", "misinformation"],
      ["OTHER", "other"],
    ];
    for (const [reasonCategory, expected] of pairs) {
      expect(
        ModerationMapper.toReportEntity({ ...PENDING, reasonCategory }).reason,
      ).toBe(expected);
    }
  });

  it("carries reasonFreeText into `note`", () => {
    expect(
      ModerationMapper.toReportEntity({
        ...PENDING,
        reasonCategory: "OTHER",
        reasonFreeText: "Bịa đặt về kỳ thi",
      }).note,
    ).toBe("Bịa đặt về kỳ thi");
  });

  it("flattens status × resolutionOutcome (ESCALATE is NOT dismissed)", () => {
    const cases: Array<
      [ReportInboxItemDto["resolutionOutcome"], ReportStatus]
    > = [
      ["DISMISS", "dismissed"],
      ["DELETE", "removed"],
      ["ESCALATE", "escalated"],
    ];
    for (const [resolutionOutcome, expected] of cases) {
      expect(
        ModerationMapper.toReportEntity({
          ...PENDING,
          status: "RESOLVED",
          resolutionOutcome,
        }).status,
      ).toBe(expected);
    }
  });

  it("maps a RESOLVED row's resolution metadata (userId, no display name)", () => {
    const entity = ModerationMapper.toReportEntity({
      ...PENDING,
      status: "RESOLVED",
      resolutionOutcome: "DELETE",
      resolvedAt: "2026-07-11T09:30:00Z",
      resolvedByUserId: "usr-77",
    });
    expect(entity.resolvedAt).toBe("2026-07-11T09:30:00Z");
    // The wire gives an id, never a display name.
    expect(entity.resolvedBy).toBe("usr-77");
    // No resolve note exists on the wire at all.
    expect(entity.resolveNote).toBeNull();
  });

  it("falls back to `dismissed` when a RESOLVED row omits its outcome", () => {
    expect(
      ModerationMapper.toReportEntity({ ...PENDING, status: "RESOLVED" })
        .status,
    ).toBe("dismissed");
  });
});

describe("ModerationMapper.toReportDetailEntity", () => {
  it("nulls the three unbacked sections (same DTO as the list row)", () => {
    const detail = ModerationMapper.toReportDetailEntity(PENDING);
    expect(detail.id).toBe("rep-1");
    expect(detail.fullContent).toBeNull();
    expect(detail.context).toBeNull();
    expect(detail.duplicateReports).toBeNull();
  });
});

describe("ModerationMapper.toStatsEntity", () => {
  it("maps the flat wire counters", () => {
    const dto: ModerationStatsResponseDto = { pending: 7, resolved: 42 };
    expect(ModerationMapper.toStatsEntity(dto)).toEqual({
      pendingCount: 7,
      resolvedCount: 42,
    });
  });
});

describe("wire request mappers", () => {
  it("maps kind → targetType", () => {
    expect(toWireTargetType("post")).toBe("POST");
    expect(toWireTargetType("comment")).toBe("COMMENT");
    expect(toWireTargetType("message")).toBe("MESSAGE");
  });

  it("maps reason → reasonCategory (round-trips with the read mapper)", () => {
    for (const reason of [
      "spam",
      "inappropriate-language",
      "bullying",
      "misinformation",
      "other",
    ] as const) {
      const wire = toWireReasonCategory(reason);
      expect(
        ModerationMapper.toReportEntity({ ...PENDING, reasonCategory: wire })
          .reason,
      ).toBe(reason);
    }
  });

  it("maps the status tab to the single readable partition", () => {
    expect(toWireStatus("pending")).toBe("PENDING");
    expect(toWireStatus("resolved")).toBe("RESOLVED");
  });

  it("maps the content-type filter, with `all` meaning 'omit the param'", () => {
    expect(toWireContentType("all")).toBeUndefined();
    expect(toWireContentType("post")).toBe("POST");
    expect(toWireContentType("comment")).toBe("COMMENT");
    expect(toWireContentType("message")).toBe("MESSAGE");
  });
});
