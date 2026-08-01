import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * QA gap-fill (US-E18.24 fe-qa-playwright gate): the Storybook interaction
 * suite proves the PRESENTATIONAL screen renders correctly for a given VM, but
 * nothing exercised `AcademicRecordSealContainer` itself — the only place that
 * wires `useMutation`'s `onSuccess` handlers to `toast.error(t("errors.<key>"))`
 * and to the special-case `same-admin-as-initiator` /
 * `unseal-request-already-approved` / `no-pending-request` branches. Same
 * node-env, no-jsdom recipe as `src/components/layout/app-shell/app-shell.test.tsx`
 * (US-E08.6): mock every hook/child import, capture what the container passes
 * to `@tanstack/react-query` and to the mocked screen component, and invoke the
 * captured functions directly as plain calls (no DOM, no act()).
 *
 * Specifically proves reachability, from a container-level trigger, of the
 * THREE new US-E18.24 failure types end-to-end to their i18n error key:
 * `unseal-request-already-approved` (confirmMutation), and
 * `unseal-request-invalid-status` / `unseal-request-invalid-cursor` (the
 * pending-list query's error surfaces as the screen-level `error` prop).
 */

const pushMock = vi.fn();
const replaceMock = vi.fn();
let searchParamsString = "tab=seal&year=2025-2026&term=HK1&classId=12C1";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  usePathname: () => "/t/school-a/admin/academic-records",
  useSearchParams: () => new URLSearchParams(searchParamsString),
}));

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));

const invalidateQueries = vi.fn();
const sealMutate = vi.fn();
const initiateMutate = vi.fn();
const confirmMutate = vi.fn();
const mutationConfigs: Array<{
  mutationFn: (...args: unknown[]) => unknown;
  onSuccess: (res: unknown, vars: unknown) => void;
}> = [];

// Mutable stub read by the mocked `useQuery`/`useInfiniteQuery` — tests mutate
// this before rendering to control what the container sees as query state.
const queryStub = {
  classes: { data: undefined as unknown, isPending: false, error: null },
  sealStatus: { data: undefined as unknown, isPending: false, error: null },
  audit: { data: undefined as unknown, isPending: false, error: null },
  sealedStudents: { data: undefined as unknown, isPending: false, error: null },
  admins: {
    data: [{ id: "admin-1", name: "Trần Minh Quân" }] as unknown,
    isPending: false,
    error: null,
  },
  pending: {
    data: {
      pages: [{ items: [], nextCursor: null, hasMore: false }],
    } as unknown,
    isPending: false,
    error: null as unknown,
    hasNextPage: false,
    isFetchingNextPage: false,
    isError: false,
    fetchNextPage: vi.fn(),
  },
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: { queryKey: readonly unknown[] }) => {
    const key = JSON.stringify(opts.queryKey);
    if (key.includes('"classes"')) return queryStub.classes;
    if (key.includes('"status"')) return queryStub.sealStatus;
    if (key.includes('"audit-trail"')) return queryStub.audit;
    if (key.includes('"sealed-students"')) return queryStub.sealedStudents;
    if (key.includes('"tenant-admins"')) return queryStub.admins;
    return { data: undefined, isPending: false, error: null };
  },
  useInfiniteQuery: () => queryStub.pending,
  useMutation: (opts: {
    mutationFn: (...args: unknown[]) => unknown;
    onSuccess: (res: unknown, vars: unknown) => void;
  }) => {
    mutationConfigs.push(opts);
    const idx = mutationConfigs.length - 1;
    const mutateSpies = [sealMutate, initiateMutate, confirmMutate];
    return { mutate: mutateSpies[idx], isPending: false };
  },
  useQueryClient: () => ({ invalidateQueries }),
}));

type CapturedVM = {
  error: string | null;
  seal: { onConfirmSeal: () => void };
  unseal: {
    onSubmitInitiate: (input: unknown) => void;
    onConfirmRequest: (requestId: string) => void;
    onConfirmSelfApprove: (requestId: string) => void;
    pendingRequests: unknown[];
    hasLoadMoreError: boolean;
  };
};
const screenCalls: CapturedVM[] = [];

vi.mock("./academic-record-seal-screen", () => ({
  AcademicRecordSealScreen: (props: { vm: CapturedVM }) => {
    screenCalls.push(props.vm);
    return null;
  },
}));

async function renderContainer() {
  const { AcademicRecordSealContainer } = await import(
    "./academic-record-seal-container"
  );
  const actions = {
    listAvailableClasses: vi.fn(),
    getSealStatus: vi.fn(),
    seal: vi.fn(),
    getAuditTrail: vi.fn(),
    listSealedStudents: vi.fn(),
    getPendingUnsealRequests: vi.fn(),
    initiateUnseal: vi.fn(),
    confirmUnseal: vi.fn(),
    listTenantAdmins: vi.fn(),
  };
  renderToStaticMarkup(
    <AcademicRecordSealContainer actions={actions} currentAdminId="admin-1" />,
  );
  return actions;
}

describe("AcademicRecordSealContainer — mutation wiring (US-E18.24 QA gate)", () => {
  beforeEach(() => {
    vi.resetModules();
    mutationConfigs.length = 0;
    screenCalls.length = 0;
    toastError.mockClear();
    toastSuccess.mockClear();
    invalidateQueries.mockClear();
    sealMutate.mockClear();
    initiateMutate.mockClear();
    confirmMutate.mockClear();
    queryStub.pending = {
      data: { pages: [{ items: [], nextCursor: null, hasMore: false }] },
      isPending: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      isError: false,
      fetchNextPage: vi.fn(),
    };
    searchParamsString = "tab=seal&year=2025-2026&term=HK1&classId=12C1";
  });

  it("registers exactly 3 mutations in source order: seal, initiate, confirm", async () => {
    await renderContainer();
    expect(mutationConfigs).toHaveLength(3);
  });

  it("wires onConfirmSeal -> sealMutation.mutate(key)", async () => {
    await renderContainer();
    screenCalls[0].seal.onConfirmSeal();
    expect(sealMutate).toHaveBeenCalledExactlyOnceWith({
      classId: "12C1",
      term: "HK1",
      year: "2025-2026",
    });
  });

  it("wires onSubmitInitiate -> initiateMutation.mutate(input)", async () => {
    await renderContainer();
    const input = {
      studentId: "s-1",
      classId: "12C1",
      term: "HK1",
      year: "2025-2026",
      reason: "x".repeat(25),
    };
    screenCalls[0].unseal.onSubmitInitiate(input);
    expect(initiateMutate).toHaveBeenCalledExactlyOnceWith(input);
  });

  it("wires onConfirmRequest -> confirmMutation.mutate({requestId, coSignerId: currentAdminId})", async () => {
    await renderContainer();
    screenCalls[0].unseal.onConfirmRequest("ur-1");
    expect(confirmMutate).toHaveBeenCalledExactlyOnceWith({
      requestId: "ur-1",
      coSignerId: "admin-1",
    });
  });

  it("wires onConfirmSelfApprove -> confirmMutation.mutate({requestId, coSignerId: null})", async () => {
    await renderContainer();
    screenCalls[0].unseal.onConfirmSelfApprove("ur-1");
    expect(confirmMutate).toHaveBeenCalledExactlyOnceWith({
      requestId: "ur-1",
      coSignerId: null,
    });
  });

  describe("sealMutation.onSuccess", () => {
    it("routes a failure to toast.error with the translated errors.<key>", async () => {
      await renderContainer();
      const sealCfg = mutationConfigs[0];
      sealCfg.onSuccess(
        { ok: false, errorKey: "already-sealed" },
        { classId: "12C1", term: "HK1", year: "2025-2026" },
      );
      expect(toastError).toHaveBeenCalledExactlyOnceWith(
        "academicRecordSeal.errors.already-sealed",
      );
      expect(toastSuccess).not.toHaveBeenCalled();
    });

    it("toasts success + invalidates sealStatus and auditTrail on success", async () => {
      await renderContainer();
      const sealCfg = mutationConfigs[0];
      sealCfg.onSuccess(
        { ok: true, data: {} },
        { classId: "12C1", term: "HK1", year: "2025-2026" },
      );
      expect(toastSuccess).toHaveBeenCalledOnce();
      expect(toastError).not.toHaveBeenCalled();
      expect(invalidateQueries).toHaveBeenCalledTimes(2);
    });
  });

  describe("initiateMutation.onSuccess", () => {
    it("routes reason-too-short to toast.error with the translated key", async () => {
      await renderContainer();
      const initiateCfg = mutationConfigs[1];
      initiateCfg.onSuccess({ ok: false, errorKey: "reason-too-short" }, {});
      expect(toastError).toHaveBeenCalledExactlyOnceWith(
        "academicRecordSeal.errors.reason-too-short",
      );
    });

    it("toasts success + broadly invalidates academicRecordSealKeys.all", async () => {
      await renderContainer();
      const initiateCfg = mutationConfigs[1];
      initiateCfg.onSuccess({ ok: true, data: {} }, {});
      expect(toastSuccess).toHaveBeenCalledOnce();
      expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({
        queryKey: ["academic-records", "seal"],
      });
    });
  });

  describe("confirmMutation.onSuccess — the 3 new US-E18.24 failure types", () => {
    it("`unseal-request-already-approved` reaches toast.error AND triggers the stale-race re-fetch invalidation", async () => {
      await renderContainer();
      const confirmCfg = mutationConfigs[2];
      confirmCfg.onSuccess(
        { ok: false, errorKey: "unseal-request-already-approved" },
        { requestId: "ur-9", coSignerId: "admin-2" },
      );
      expect(toastError).toHaveBeenCalledExactlyOnceWith(
        "academicRecordSeal.errors.unseal-request-already-approved",
      );
      // Same stale-race recovery as `no-pending-request` — the container
      // proactively invalidates so the next render reflects the real state.
      expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith({
        queryKey: ["academic-records", "seal"],
      });
    });

    it("`no-pending-request` gets the same toast + invalidate treatment as `unseal-request-already-approved`", async () => {
      await renderContainer();
      const confirmCfg = mutationConfigs[2];
      confirmCfg.onSuccess(
        { ok: false, errorKey: "no-pending-request" },
        { requestId: "ur-9", coSignerId: "admin-2" },
      );
      expect(toastError).toHaveBeenCalledExactlyOnceWith(
        "academicRecordSeal.errors.no-pending-request",
      );
      expect(invalidateQueries).toHaveBeenCalledOnce();
    });

    it("`same-admin-as-initiator` takes the dialog-branch early return — NO toast, no generic showError", async () => {
      await renderContainer();
      const confirmCfg = mutationConfigs[2];
      confirmCfg.onSuccess(
        { ok: false, errorKey: "same-admin-as-initiator" },
        { requestId: "ur-1", coSignerId: "admin-1" },
      );
      expect(toastError).not.toHaveBeenCalled();
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it("a generic failure (e.g. `forbidden`) falls through to plain showError with no extra invalidation", async () => {
      await renderContainer();
      const confirmCfg = mutationConfigs[2];
      confirmCfg.onSuccess(
        { ok: false, errorKey: "forbidden" },
        { requestId: "ur-1", coSignerId: "admin-2" },
      );
      expect(toastError).toHaveBeenCalledExactlyOnceWith(
        "academicRecordSeal.errors.forbidden",
      );
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it("self-approve success picks the self-approve toast copy (coSignerId===null)", async () => {
      await renderContainer();
      const confirmCfg = mutationConfigs[2];
      confirmCfg.onSuccess(
        { ok: true, data: {} },
        { requestId: "ur-1", coSignerId: null },
      );
      expect(toastSuccess).toHaveBeenCalledExactlyOnceWith(
        "academicRecordSeal.unseal.success.selfApproveToast",
      );
    });

    it("co-signed confirm success picks the confirm toast copy (coSignerId!==null)", async () => {
      await renderContainer();
      const confirmCfg = mutationConfigs[2];
      confirmCfg.onSuccess(
        { ok: true, data: {} },
        { requestId: "ur-1", coSignerId: "admin-2" },
      );
      expect(toastSuccess).toHaveBeenCalledExactlyOnceWith(
        "academicRecordSeal.unseal.success.confirmToast",
      );
    });
  });

  describe("pending-list query error surfaces the other 2 new failure types (invalid-status/invalid-cursor)", () => {
    beforeEach(() => {
      // These 2 failure types can only ever come from the pending-list GET
      // (listing status/cursor validation) — route the container to the
      // "unseal" tab so `activeError` is actually derived from `pendingQuery`
      // (on "seal" it would read `classesQuery.error` instead, per
      // `academic-record-seal-container.tsx`'s `activeTab === "seal" ? … : …`).
      searchParamsString = "tab=unseal&year=2025-2026&term=HK1&classId=12C1";
    });

    it("`unseal-request-invalid-status` from the listing query becomes the screen-level `error` prop", async () => {
      queryStub.pending = {
        ...queryStub.pending,
        data: undefined,
        error: "unseal-request-invalid-status",
        isError: true,
      };
      await renderContainer();
      expect(screenCalls[0].error).toBe("unseal-request-invalid-status");
    });

    it("`unseal-request-invalid-cursor` from the listing query becomes the screen-level `error` prop", async () => {
      queryStub.pending = {
        ...queryStub.pending,
        data: undefined,
        error: "unseal-request-invalid-cursor",
        isError: true,
      };
      await renderContainer();
      expect(screenCalls[0].error).toBe("unseal-request-invalid-cursor");
    });

    it("does NOT escalate a load-more-only failure to the screen-level error, and flips hasLoadMoreError instead (rows already loaded)", async () => {
      queryStub.pending = {
        ...queryStub.pending,
        data: {
          pages: [
            {
              items: [{ requestId: "ur-1" }],
              nextCursor: "c-2",
              hasMore: true,
            },
          ],
        },
        error: "unseal-request-invalid-cursor",
        isError: true,
      };
      await renderContainer();
      // First-page-only escalation: rows are present, so the screen-level
      // `error` must stay null — the already-loaded row is never blanked.
      expect(screenCalls[0].error).toBeNull();
      expect(screenCalls[0].unseal.pendingRequests).toHaveLength(1);
      expect(screenCalls[0].unseal.hasLoadMoreError).toBe(true);
    });
  });
});
