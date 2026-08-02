import { makeGetProfileUseCase } from "@/bootstrap/di/auth.di";
import { makeListMyMembershipsUseCase } from "@/bootstrap/di/tenant.di";
import {
  classifyMembershipCount,
  isSwitchable,
  type TenantMembership,
} from "@/features/tenant/domain/entities/tenant-membership.entity";
import { enrichMemberships } from "@/features/tenant/infrastructure/enrich-memberships";
import { switchTenantAction } from "./actions";
import { AutoSwitchTenant } from "./auto-switch-tenant";
import { SelectTenant } from "./select-tenant";

/** Soft-fetch the caller's display name for the greeting. A failure here is NOT
 *  the hard error path (AC-001.2) — fall back to a name-less subheading. */
async function loadUserName(): Promise<string | null> {
  try {
    const result = await (await makeGetProfileUseCase()).execute();
    return result.data?.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Post-login select-tenant gate (US-E23.2). Resolves the four-way routing
 * branch as an RSC (no client fetch): fetch the membership list (FR-008 hard
 * error on failure), classify by ACTIVE count, then:
 *  - `"single"` → mint + redirect straight into the sole tenant (FR-006);
 *  - `"none"`   → empty state + escape action (FR-007);
 *  - `"multiple"` → personalized card grid (FR-002/003).
 */
export default async function SelectTenantPage() {
  let memberships: TenantMembership[];
  try {
    memberships = await (await makeListMyMembershipsUseCase()).execute();
  } catch {
    // FR-008 — hard-gate fetch failure. Do NOT let this escape to Next's
    // generic error boundary; render this screen's own error+retry state.
    // A 401 is handled upstream by the guard/refresh flow (AC-004.4), never here.
    return (
      <SelectTenant
        screenState={{ kind: "error" }}
        onSwitchTenant={switchTenantAction}
      />
    );
  }

  const branch = classifyMembershipCount(memberships);

  if (branch === "single") {
    // FR-006 zero-noise skip: mint the tenant-scoped token + redirect directly.
    // Cookie writes are only legal inside a real Server Action invocation —
    // calling `switchTenantAction` during this RSC render throws "Cookies can
    // only be modified in a Server Action or Route Handler". So the sole
    // membership auto-switches CLIENT-side on mount (skeleton → redirect;
    // `{ ok:false }` falls through to this screen's error state).
    const sole = memberships.find(isSwitchable);
    if (sole) {
      return (
        <AutoSwitchTenant
          tenantId={sole.tenantId}
          role={sole.roles[0] ?? ""}
          onSwitchTenant={switchTenantAction}
        />
      );
    }
    return (
      <SelectTenant
        screenState={{ kind: "error" }}
        onSwitchTenant={switchTenantAction}
      />
    );
  }

  if (branch === "none") {
    return (
      <SelectTenant
        screenState={{ kind: "empty" }}
        onSwitchTenant={switchTenantAction}
      />
    );
  }

  // branch === "multiple": ≥2 ACTIVE memberships → personalized card grid.
  // Only ACTIVE memberships become cards (FR-003) and drive the count; the
  // profile name is a soft-fetch (name-less fallback on failure, AC-001.2).
  const userName = await loadUserName();
  const cards = enrichMemberships(memberships.filter(isSwitchable), null);
  return (
    <SelectTenant
      screenState={{
        kind: "cards",
        userName,
        count: cards.length,
        cards,
      }}
      onSwitchTenant={switchTenantAction}
    />
  );
}
