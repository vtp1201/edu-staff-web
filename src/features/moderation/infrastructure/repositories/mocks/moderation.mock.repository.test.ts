import { describe, expect, it } from "vitest";
import { DEFAULT_REPORT_QUEUE_FILTER } from "../../../domain/entities/report-queue-filter.entity";
import {
  MOCK_FORBIDDEN_REPORT_ID,
  MockModerationRepository,
} from "./moderation.mock.repository";

const PENDING = DEFAULT_REPORT_QUEUE_FILTER;

async function firstPendingId(repo: MockModerationRepository): Promise<string> {
  const res = await repo.listReports(PENDING, null);
  if (!res.ok) throw new Error("expected ok");
  const target = res.value.reports.find(
    (r) => r.id !== MOCK_FORBIDDEN_REPORT_ID,
  );
  if (!target) throw new Error("no pending report");
  return target.id;
}

describe("MockModerationRepository", () => {
  it("lists pending reports with embedded stats", async () => {
    const repo = new MockModerationRepository();
    const res = await repo.listReports(PENDING, null);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.reports.every((r) => r.status === "pending")).toBe(true);
    expect(res.value.stats.pendingCount).toBeGreaterThan(0);
    expect(res.value.stats.removedCount).toBeGreaterThan(0);
  });

  it("filters by content type (AND)", async () => {
    const repo = new MockModerationRepository();
    const res = await repo.listReports(
      { ...PENDING, contentType: "comment" },
      null,
    );
    if (!res.ok) throw new Error("ok");
    expect(res.value.reports.every((r) => r.kind === "comment")).toBe(true);
  });

  it("surfaces a duplicate-report list for a triple-reported content", async () => {
    const repo = new MockModerationRepository();
    const list = await repo.listReports(PENDING, null);
    if (!list.ok) throw new Error("ok");
    const dup = list.value.reports.find((r) => r.duplicateCount === 2);
    expect(dup).toBeDefined();
    if (!dup) return;
    const detail = await repo.getReportDetail(dup.id);
    if (!detail.ok) throw new Error("ok");
    expect(detail.value.duplicateReports).toHaveLength(2);
  });

  it("dismiss transitions status → dismissed AND appends an audit entry", async () => {
    const repo = new MockModerationRepository();
    const id = await firstPendingId(repo);
    const before = await repo.getModerationAuditLog("scope", null);
    if (!before.ok) throw new Error("ok");
    const beforeCount = before.value.entries.length;

    const res = await repo.dismissReport(id);
    expect(res.ok).toBe(true);

    const detail = await repo.getReportDetail(id);
    if (!detail.ok) throw new Error("ok");
    expect(detail.value.status).toBe("dismissed");

    const after = await repo.getModerationAuditLog("scope", null);
    if (!after.ok) throw new Error("ok");
    expect(after.value.entries.length).toBe(beforeCount + 1);
    expect(after.value.entries[0].action).toBe("dismissed");
  });

  it("remove transitions status → removed AND appends an audit entry", async () => {
    const repo = new MockModerationRepository();
    const id = await firstPendingId(repo);
    const list = await repo.listReports(PENDING, null);
    if (!list.ok) throw new Error("ok");
    const target = list.value.reports.find((r) => r.id === id);
    if (!target) throw new Error("target");

    const res = await repo.removeContent({
      kind: target.kind === "message" ? "post" : target.kind,
      contentId: target.contentId,
      reportId: id,
      resolveNote: "vi phạm nội quy",
    });
    expect(res.ok).toBe(true);

    const audit = await repo.getModerationAuditLog("scope", null);
    if (!audit.ok) throw new Error("ok");
    expect(audit.value.entries[0].action).toBe("removed");
  });

  it("removing the forbidden fixture always returns forbidden (deterministic 403)", async () => {
    const repo = new MockModerationRepository();
    const res = await repo.removeContent({
      kind: "post",
      contentId: "post-403",
      reportId: MOCK_FORBIDDEN_REPORT_ID,
    });
    expect(res).toEqual({ ok: false, error: { type: "forbidden" } });
  });

  it("ADR 0052: removing content WITHOUT a reportId (feed direct-removal) succeeds", async () => {
    const repo = new MockModerationRepository();
    const res = await repo.removeContent({
      kind: "post",
      contentId: "feed-post-1",
    });
    expect(res).toEqual({ ok: true });
  });

  it("dismissing an already-resolved report returns already-resolved", async () => {
    const repo = new MockModerationRepository();
    const id = await firstPendingId(repo);
    await repo.dismissReport(id);
    const second = await repo.dismissReport(id);
    expect(second).toEqual({ ok: false, error: { type: "already-resolved" } });
  });

  it("detail for an unknown id returns not-found", async () => {
    const repo = new MockModerationRepository();
    const res = await repo.getReportDetail("nope");
    expect(res).toEqual({ ok: false, error: { type: "not-found" } });
  });
});
