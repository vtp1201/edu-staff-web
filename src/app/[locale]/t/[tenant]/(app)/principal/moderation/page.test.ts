import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ModerationScreenVM } from "@/features/moderation/presentation/moderation-screen/moderation-screen.i-vm";

/**
 * Route-level proof for US-E18.32:
 *
 * 1. `auditLogEnabled` is wired to `USE_MOCK`. Outside mock mode NO endpoint
 *    backs this feature's dismiss/remove audit trail (the one gap BE US-172 did
 *    not close), and `ModerationRepository.getModerationAuditLog` degrades with
 *    zero HTTP — so the tab must be hidden rather than shown broken or, worse,
 *    filled from the in-memory mock. A wrong value here would surface a
 *    fabricated compliance trail in production (`USE_MOCK` is false when the
 *    env var is unset — the non-mock branch IS production).
 * 2. Stats come from their OWN read (`repo.getReportStats()`), never from the
 *    list result, and a failed stats read seeds `null` — NOT zeros, which would
 *    render as genuine "0 pending / 0 resolved" counters.
 *
 * `USE_MOCK` is a module-eval-time const → mock the module + `vi.resetModules()`
 * per test (recipe from the sibling feed/exam-bank `page.test.ts`).
 */

const listExecute = vi.fn();
const getReportStats = vi.fn();

function mockDeps(useMock: boolean) {
  vi.doMock("@/bootstrap/lib/mock", () => ({ USE_MOCK: useMock }));
  vi.doMock("@/bootstrap/di/moderation.di", () => ({
    makeListReportsUseCase: async () => ({ execute: listExecute }),
    makeModerationRepository: async () => ({ getReportStats }),
  }));
  vi.doMock("./actions", () => ({
    listReportsAction: vi.fn(),
    getReportStatsAction: vi.fn(),
    getReportDetailAction: vi.fn(),
    dismissReportAction: vi.fn(),
    removeContentAction: vi.fn(),
    getModerationAuditLogAction: vi.fn(),
  }));
}

async function renderVm(): Promise<ModerationScreenVM> {
  const { default: Page } = await import("./page");
  const element = (await Page({
    params: Promise.resolve({ tenant: "t-1" }),
    searchParams: Promise.resolve({}),
  })) as { props: ModerationScreenVM };
  return element.props;
}

beforeEach(() => {
  vi.resetModules();
  // The spies live at module scope — `resetModules` does not clear their calls.
  vi.clearAllMocks();
  listExecute.mockResolvedValue({
    ok: true,
    value: { reports: [], nextCursor: null, hasMore: false },
  });
  getReportStats.mockResolvedValue({
    ok: true,
    value: { pendingCount: 4, resolvedCount: 9 },
  });
});

describe("PrincipalModerationPage — audit gate + stats source", () => {
  for (const useMock of [true, false]) {
    it(`auditLogEnabled === USE_MOCK (${useMock})`, async () => {
      mockDeps(useMock);
      expect((await renderVm()).auditLogEnabled).toBe(useMock);
    });
  }

  it("seeds the stat row from the stats read, not from the list page", async () => {
    mockDeps(false);
    const vm = await renderVm();
    expect(getReportStats).toHaveBeenCalledTimes(1);
    expect(vm.initialStats).toEqual({ pendingCount: 4, resolvedCount: 9 });
    // The list result contributed zero rows — the counters are unaffected.
    expect(vm.initialQueuePage.reports).toEqual([]);
  });

  it("seeds null (never zeros) when the stats read fails", async () => {
    mockDeps(false);
    getReportStats.mockResolvedValue({
      ok: false,
      error: { type: "network-error" },
    });
    const vm = await renderVm();
    // Zeros would render as a real "nothing to moderate" state.
    expect(vm.initialStats).toBeNull();
  });

  it("keeps the queue error key when the list read fails", async () => {
    mockDeps(false);
    listExecute.mockResolvedValue({
      ok: false,
      error: { type: "forbidden" },
    });
    const vm = await renderVm();
    expect(vm.initialErrorKey).toBe("forbidden");
    expect(vm.initialQueuePage).toEqual({
      reports: [],
      nextCursor: null,
      hasMore: false,
    });
  });
});
