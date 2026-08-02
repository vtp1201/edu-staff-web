import { describe, expect, it } from "vitest";
import {
  type ReportRef,
  reportRefOf,
} from "../../../domain/entities/report.entity";
import { DEFAULT_REPORT_QUEUE_FILTER } from "../../../domain/entities/report-queue-filter.entity";
import {
  MOCK_FORBIDDEN_REPORT_ID,
  MockModerationRepository,
} from "./moderation.mock.repository";

const PENDING = DEFAULT_REPORT_QUEUE_FILTER;

async function firstPendingRef(
  repo: MockModerationRepository,
): Promise<ReportRef> {
  const res = await repo.listReports(PENDING, null);
  if (!res.ok) throw new Error("expected ok");
  const target = res.value.reports.find(
    (r) => r.id !== MOCK_FORBIDDEN_REPORT_ID,
  );
  if (!target) throw new Error("no pending report");
  return reportRefOf(target);
}

describe("MockModerationRepository", () => {
  it("lists pending reports (page carries NO stats)", async () => {
    const repo = new MockModerationRepository();
    const res = await repo.listReports(PENDING, null);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.reports.every((r) => r.status === "pending")).toBe(true);
    expect(res.value).not.toHaveProperty("stats");
  });

  it("serves stats from their own call, counting the WHOLE set (not a page)", async () => {
    const repo = new MockModerationRepository();
    const stats = await repo.getReportStats();
    if (!stats.ok) throw new Error("ok");

    const pendingPage = await repo.listReports(PENDING, null);
    if (!pendingPage.ok) throw new Error("ok");

    expect(stats.value.pendingCount).toBe(pendingPage.value.reports.length);
    // The resolved rows are NOT on the pending page, yet are still counted.
    expect(stats.value.resolvedCount).toBeGreaterThan(0);
  });

  it("stats ignore an active content-type filter", async () => {
    const repo = new MockModerationRepository();
    const before = await repo.getReportStats();
    await repo.listReports({ ...PENDING, contentType: "comment" }, null);
    const after = await repo.getReportStats();
    expect(after).toEqual(before);
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
    const detail = await repo.getReportDetail(reportRefOf(dup));
    if (!detail.ok) throw new Error("ok");
    expect(detail.value.duplicateReports).toHaveLength(2);
  });

  it("dismiss transitions status → dismissed AND appends an audit entry", async () => {
    const repo = new MockModerationRepository();
    const ref = await firstPendingRef(repo);
    const before = await repo.getModerationAuditLog("scope", null);
    if (!before.ok) throw new Error("ok");
    const beforeCount = before.value.entries.length;

    const res = await repo.dismissReport(ref);
    expect(res.ok).toBe(true);

    // The row moved partition: re-read it with the RESOLVED-side ref.
    const detail = await repo.getReportDetail({ ...ref, status: "dismissed" });
    if (!detail.ok) throw new Error("ok");
    expect(detail.value.status).toBe("dismissed");

    const after = await repo.getModerationAuditLog("scope", null);
    if (!after.ok) throw new Error("ok");
    expect(after.value.entries.length).toBe(beforeCount + 1);
    expect(after.value.entries[0].action).toBe("dismissed");
  });

  it("remove transitions status → removed AND appends an audit entry", async () => {
    const repo = new MockModerationRepository();
    const ref = await firstPendingRef(repo);
    const list = await repo.listReports(PENDING, null);
    if (!list.ok) throw new Error("ok");
    const target = list.value.reports.find((r) => r.id === ref.reportId);
    if (!target) throw new Error("target");

    const res = await repo.removeContent({
      kind: target.kind === "message" ? "post" : target.kind,
      contentId: target.contentId,
      ref,
    });
    expect(res.ok).toBe(true);

    const audit = await repo.getModerationAuditLog("scope", null);
    if (!audit.ok) throw new Error("ok");
    expect(audit.value.entries[0].action).toBe("removed");
  });

  it("removing the forbidden fixture always returns forbidden (deterministic 403)", async () => {
    const repo = new MockModerationRepository();
    const list = await repo.listReports(PENDING, null);
    if (!list.ok) throw new Error("ok");
    const forbidden = list.value.reports.find(
      (r) => r.id === MOCK_FORBIDDEN_REPORT_ID,
    );
    if (!forbidden) throw new Error("fixture");

    const res = await repo.removeContent({
      kind: "post",
      contentId: forbidden.contentId,
      ref: reportRefOf(forbidden),
    });
    expect(res).toEqual({ ok: false, error: { type: "forbidden" } });
  });

  it("ADR 0052: removing a post WITHOUT a report ref (feed direct-removal) succeeds", async () => {
    const repo = new MockModerationRepository();
    const res = await repo.removeContent({
      kind: "post",
      contentId: "feed-post-1",
    });
    expect(res).toEqual({ ok: true });
  });

  it("direct comment removal without a parentId is rejected (matches the real route)", async () => {
    const repo = new MockModerationRepository();
    const res = await repo.removeContent({
      kind: "comment",
      contentId: "feed-comment-1",
    });
    expect(res).toEqual({ ok: false, error: { type: "validation" } });
  });

  it("dismissing an already-resolved report returns already-resolved", async () => {
    const repo = new MockModerationRepository();
    const ref = await firstPendingRef(repo);
    await repo.dismissReport(ref);
    const second = await repo.dismissReport(ref);
    expect(second).toEqual({ ok: false, error: { type: "already-resolved" } });
  });

  it("detail for an unknown id returns not-found", async () => {
    const repo = new MockModerationRepository();
    const res = await repo.getReportDetail({
      reportId: "nope",
      filedAt: "2026-07-10T08:00:00Z",
      status: "pending",
    });
    expect(res).toEqual({ ok: false, error: { type: "not-found" } });
  });

  it("detail with a MISMATCHED filedAt is not-found (the tuple addresses the row)", async () => {
    const repo = new MockModerationRepository();
    const ref = await firstPendingRef(repo);
    const res = await repo.getReportDetail({
      ...ref,
      filedAt: "1999-01-01T00:00:00Z",
    });
    expect(res).toEqual({ ok: false, error: { type: "not-found" } });
  });

  it("detail from the WRONG status partition is not-found (whole tuple, not just filedAt)", async () => {
    // The real point-read sends `status` as a PARTITION selector (PENDING vs
    // RESOLVED), so a still-pending row read from the RESOLVED side resolves
    // to nothing. The mock must match that, or it would hide a UI bug that
    // drops `status` from the ref.
    const repo = new MockModerationRepository();
    const ref = await firstPendingRef(repo);
    const res = await repo.getReportDetail({ ...ref, status: "dismissed" });
    expect(res).toEqual({ ok: false, error: { type: "not-found" } });
  });

  it("the resolve WRITE is keyed by (reportId, filedAt) only — a stale status still 409s", async () => {
    // `POST /reports/{id}/resolve` sends `filedAt` as the CAS key and NO
    // status, so the server answers 409 (already resolved), not 404. Adding a
    // partition predicate here would misreport that conflict as not-found.
    const repo = new MockModerationRepository();
    const ref = await firstPendingRef(repo);
    expect((await repo.dismissReport(ref)).ok).toBe(true);
    expect(await repo.dismissReport(ref)).toEqual({
      ok: false,
      error: { type: "already-resolved" },
    });
  });
});
