import { describe, expect, it, vi } from "vitest";
import type { AuditEvent } from "../entities/audit-event.entity";
import type { AuditLogFilter } from "../entities/audit-log-filter.entity";
import type {
  AuditLogPageResult,
  AuditLogResult,
  IAuditLogRepository,
} from "../repositories/i-audit-log.repository";
import { GetAuditLogUseCase } from "./get-audit-log.use-case";

const sampleEvent: AuditEvent = {
  id: "log-1",
  occurredAt: "2026-06-13T09:42:11.000Z",
  actorId: "admin-1",
  actorName: "Trần Minh Quân",
  actorRole: "admin",
  action: "UPDATE",
  entityType: "grade",
  entityId: "gr-1",
  entityLabel: "Toán · Cuối kỳ",
  beforeValue: "8.5",
  afterValue: "9.0",
};

function makeRepo(result: AuditLogResult<AuditLogPageResult>): {
  repo: IAuditLogRepository;
  getAuditLog: ReturnType<typeof vi.fn>;
} {
  const getAuditLog = vi.fn(async () => result);
  return { repo: { getAuditLog }, getAuditLog };
}

describe("GetAuditLogUseCase", () => {
  it("delegates a valid filter to the repo and returns its result unchanged", async () => {
    const page: AuditLogPageResult = {
      events: [sampleEvent],
      nextCursor: "c1",
      hasMore: true,
    };
    const { repo, getAuditLog } = makeRepo({ ok: true, value: page });
    const useCase = new GetAuditLogUseCase(repo);

    const filter: AuditLogFilter = {
      entityType: "grade",
      from: "2026-06-01",
      to: "2026-06-30",
    };
    const res = await useCase.execute(filter, null, 20);

    expect(getAuditLog).toHaveBeenCalledWith(filter, null, 20);
    expect(res).toEqual({ ok: true, value: page });
  });

  it("returns invalid-filter without calling the repo when from > to", async () => {
    const { repo, getAuditLog } = makeRepo({
      ok: true,
      value: { events: [], nextCursor: null, hasMore: false },
    });
    const useCase = new GetAuditLogUseCase(repo);

    const res = await useCase.execute(
      { from: "2026-06-30", to: "2026-06-01" },
      null,
      20,
    );

    expect(getAuditLog).not.toHaveBeenCalled();
    expect(res).toEqual({ ok: false, error: { type: "invalid-filter" } });
  });

  it("allows from == to (single-day range)", async () => {
    const { repo, getAuditLog } = makeRepo({
      ok: true,
      value: { events: [], nextCursor: null, hasMore: false },
    });
    const useCase = new GetAuditLogUseCase(repo);

    await useCase.execute({ from: "2026-06-10", to: "2026-06-10" }, null, 20);

    expect(getAuditLog).toHaveBeenCalledOnce();
  });

  it("passes through a repository failure", async () => {
    const { repo } = makeRepo({ ok: false, error: { type: "network-error" } });
    const useCase = new GetAuditLogUseCase(repo);

    const res = await useCase.execute({}, null, 20);

    expect(res).toEqual({ ok: false, error: { type: "network-error" } });
  });

  it("forwards a cursor for load-more pagination", async () => {
    const { repo, getAuditLog } = makeRepo({
      ok: true,
      value: { events: [], nextCursor: null, hasMore: false },
    });
    const useCase = new GetAuditLogUseCase(repo);

    await useCase.execute({}, "cursor-page-2", 20);

    expect(getAuditLog).toHaveBeenCalledWith({}, "cursor-page-2", 20);
  });
});
