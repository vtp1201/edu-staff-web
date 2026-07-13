import { describe, expect, it, vi } from "vitest";
import type { ReportQueueFilter } from "../entities/report-queue-filter.entity";
import type {
  IModerationRepository,
  ModerationActionResult,
} from "../repositories/i-moderation.repository";
import { DismissReportUseCase } from "./dismiss-report.use-case";
import { GetModerationAuditLogUseCase } from "./get-moderation-audit-log.use-case";
import { ListReportsUseCase } from "./list-reports.use-case";
import { RemoveContentUseCase } from "./remove-content.use-case";
import { SubmitReportUseCase } from "./submit-report.use-case";

function makeRepo(
  overrides: Partial<IModerationRepository> = {},
): IModerationRepository {
  return {
    createReport: vi.fn(),
    listReports: vi.fn(),
    getReportDetail: vi.fn(),
    dismissReport: vi.fn(),
    removeContent: vi.fn(),
    getModerationAuditLog: vi.fn(),
    ...overrides,
  };
}

const OK: ModerationActionResult = { ok: true };

describe("SubmitReportUseCase", () => {
  it("delegates a valid non-other report to the repo (trimmed note dropped)", async () => {
    const createReport = vi.fn().mockResolvedValue(OK);
    const uc = new SubmitReportUseCase(makeRepo({ createReport }));

    const res = await uc.execute({
      kind: "post",
      contentId: "c-1",
      reason: "spam",
    });

    expect(res).toEqual(OK);
    expect(createReport).toHaveBeenCalledWith({
      kind: "post",
      contentId: "c-1",
      reason: "spam",
      note: undefined,
    });
  });

  it('requires a non-empty note for reason="other" (no repo call)', async () => {
    const createReport = vi.fn().mockResolvedValue(OK);
    const uc = new SubmitReportUseCase(makeRepo({ createReport }));

    const res = await uc.execute({
      kind: "comment",
      contentId: "c-2",
      reason: "other",
      note: "   ",
    });

    expect(res).toEqual({ ok: false, error: { type: "validation" } });
    expect(createReport).not.toHaveBeenCalled();
  });

  it('forwards a trimmed note for reason="other"', async () => {
    const createReport = vi.fn().mockResolvedValue(OK);
    const uc = new SubmitReportUseCase(makeRepo({ createReport }));

    await uc.execute({
      kind: "message",
      contentId: "c-3",
      reason: "other",
      note: "  quấy rối kéo dài  ",
    });

    expect(createReport).toHaveBeenCalledWith({
      kind: "message",
      contentId: "c-3",
      reason: "other",
      note: "quấy rối kéo dài",
    });
  });
});

describe("passthrough use-cases", () => {
  it("ListReportsUseCase forwards filter + cursor verbatim", async () => {
    const listReports = vi.fn().mockResolvedValue({ ok: true, value: {} });
    const uc = new ListReportsUseCase(makeRepo({ listReports }));
    const filter: ReportQueueFilter = {
      status: "pending",
      contentType: "post",
      search: "abc",
    };
    await uc.execute(filter, "cursor-1");
    expect(listReports).toHaveBeenCalledWith(filter, "cursor-1");
  });

  it("DismissReportUseCase forwards reportId", async () => {
    const dismissReport = vi.fn().mockResolvedValue(OK);
    const uc = new DismissReportUseCase(makeRepo({ dismissReport }));
    await uc.execute("r-9");
    expect(dismissReport).toHaveBeenCalledWith("r-9");
  });

  it("RemoveContentUseCase forwards the full input", async () => {
    const removeContent = vi.fn().mockResolvedValue(OK);
    const uc = new RemoveContentUseCase(makeRepo({ removeContent }));
    const input = {
      kind: "post" as const,
      contentId: "c-4",
      reportId: "r-4",
      resolveNote: "vi phạm nội quy",
    };
    await uc.execute(input);
    expect(removeContent).toHaveBeenCalledWith(input);
  });

  it("GetModerationAuditLogUseCase forwards scopeId + cursor", async () => {
    const getModerationAuditLog = vi
      .fn()
      .mockResolvedValue({ ok: true, value: {} });
    const uc = new GetModerationAuditLogUseCase(
      makeRepo({ getModerationAuditLog }),
    );
    await uc.execute("scope-1", null);
    expect(getModerationAuditLog).toHaveBeenCalledWith("scope-1", null);
  });
});
