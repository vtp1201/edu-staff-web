import { isRedirectError } from "next/dist/client/components/redirect-error";
import type { SwitchTenantResult } from "./tenant-card.i-vm";

/**
 * Framework-free controller for one card-switch activation (US-E23.1, Risk A).
 * Extracted from `TenantSwitchDialog` so the redirect-vs-error classification is
 * unit-testable without mounting Radix (state-design.md §9). No optimistic
 * mutation — the only "success" signal is the navigation the Server Action's
 * `redirect()` triggers.
 */
export interface SwitchActivationDeps {
  /** The `switchTenantAction` server-action-as-prop (Path A). */
  onSwitchTenant: (
    tenantId: string,
    role: string,
  ) => Promise<SwitchTenantResult>;
  /** Set/clear the single in-flight card id (drives per-card `aria-busy`). */
  onLoading: (tenantId: string | null) => void;
  /** Show the inline 403 error on the given card (FR-008). */
  onForbidden: (tenantId: string) => void;
  /** Fire the generic retryable toast (FR-009). */
  onGenericError: () => void;
}

/**
 * Run one activation. Rethrows a Next `redirect()` throw UNCHANGED (Risk A —
 * the success navigation must never be swallowed as an application error).
 * Classifies the Path-A discriminated result: forbidden → inline card error,
 * network/unknown → toast; both reset loading. `{ ok:true }` (unreachable in
 * practice because `redirect()` throws first) leaves loading set — the tree
 * unmounts on navigation.
 */
export async function runSwitchActivation(
  tenantId: string,
  role: string,
  deps: SwitchActivationDeps,
): Promise<void> {
  deps.onLoading(tenantId);
  try {
    const result = await deps.onSwitchTenant(tenantId, role);
    if (result && result.ok === false) {
      if (result.errorKey === "forbidden") {
        deps.onForbidden(tenantId);
      } else {
        deps.onGenericError();
      }
      deps.onLoading(null);
    }
    // result.ok === true → navigation via redirect(); keep loading until unmount.
  } catch (err) {
    if (isRedirectError(err)) throw err; // Risk A — propagate, never swallow.
    deps.onGenericError();
    deps.onLoading(null);
  }
}
