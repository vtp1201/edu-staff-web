/**
 * US-E23.1 Risk A proof (the single most important test in this story).
 * `runSwitchActivation` is the framework-free controller extracted from
 * `TenantSwitchDialog` so the redirect-vs-error classification is unit-testable
 * without mounting Radix (state-design.md §9). A NEXT_REDIRECT throw MUST
 * propagate uncaught; a real application error MUST be classified, never
 * swallow the redirect.
 */
import { describe, expect, it, vi } from "vitest";
import {
  runSwitchActivation,
  type SwitchActivationDeps,
} from "./switch-activation";

function nextRedirectError(): Error & { digest: string } {
  const e = new Error("NEXT_REDIRECT") as Error & { digest: string };
  e.digest = "NEXT_REDIRECT;replace;/vi/t/tenant-x/teacher;307;";
  return e;
}

function makeDeps(
  onSwitchTenant: SwitchActivationDeps["onSwitchTenant"],
): SwitchActivationDeps & {
  loadingCalls: (string | null)[];
  forbiddenCalls: string[];
  genericCalls: number;
} {
  const loadingCalls: (string | null)[] = [];
  const forbiddenCalls: string[] = [];
  let genericCalls = 0;
  const deps = {
    onSwitchTenant,
    onLoading: (id: string | null) => loadingCalls.push(id),
    onForbidden: (id: string) => forbiddenCalls.push(id),
    onGenericError: () => {
      genericCalls += 1;
    },
    loadingCalls,
    forbiddenCalls,
    get genericCalls() {
      return genericCalls;
    },
  };
  return deps;
}

describe("runSwitchActivation", () => {
  it("sets loading immediately for the activated card", async () => {
    const deps = makeDeps(vi.fn().mockResolvedValue({ ok: true }));
    await runSwitchActivation("tenant-x", "teacher", deps);
    expect(deps.loadingCalls[0]).toBe("tenant-x");
  });

  it("PROPAGATES a NEXT_REDIRECT throw uncaught (Risk A — success navigation)", async () => {
    const err = nextRedirectError();
    const deps = makeDeps(vi.fn().mockRejectedValue(err));
    await expect(runSwitchActivation("tenant-x", "teacher", deps)).rejects.toBe(
      err,
    );
    // must NOT be misclassified as an application error
    expect(deps.genericCalls).toBe(0);
    expect(deps.forbiddenCalls).toHaveLength(0);
  });

  it("classifies a forbidden result → inline card error + resets loading", async () => {
    const deps = makeDeps(
      vi.fn().mockResolvedValue({ ok: false, errorKey: "forbidden" }),
    );
    await runSwitchActivation("tenant-x", "teacher", deps);
    expect(deps.forbiddenCalls).toEqual(["tenant-x"]);
    expect(deps.genericCalls).toBe(0);
    expect(deps.loadingCalls.at(-1)).toBeNull();
  });

  it("classifies a network result → generic toast + resets loading", async () => {
    const deps = makeDeps(
      vi.fn().mockResolvedValue({ ok: false, errorKey: "network" }),
    );
    await runSwitchActivation("tenant-x", "teacher", deps);
    expect(deps.genericCalls).toBe(1);
    expect(deps.forbiddenCalls).toHaveLength(0);
    expect(deps.loadingCalls.at(-1)).toBeNull();
  });

  it("treats an unexpected non-redirect throw as a generic error (never rethrown)", async () => {
    const deps = makeDeps(vi.fn().mockRejectedValue(new Error("boom")));
    await expect(
      runSwitchActivation("tenant-x", "teacher", deps),
    ).resolves.toBeUndefined();
    expect(deps.genericCalls).toBe(1);
    expect(deps.loadingCalls.at(-1)).toBeNull();
  });

  it("on { ok:true } keeps loading (navigation pending) — no error surface", async () => {
    const deps = makeDeps(vi.fn().mockResolvedValue({ ok: true }));
    await runSwitchActivation("tenant-x", "teacher", deps);
    expect(deps.genericCalls).toBe(0);
    expect(deps.forbiddenCalls).toHaveLength(0);
    // loading only ever set to the tenant id, never reset to null on success
    expect(deps.loadingCalls).toEqual(["tenant-x"]);
  });
});
