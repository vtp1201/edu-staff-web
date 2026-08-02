"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { runSwitchActivation } from "@/components/shared/tenant-card/switch-activation";
import type { Props } from "./select-tenant";
import { SelectTenant } from "./select-tenant";
import { SelectTenantSkeleton } from "./select-tenant-skeleton";

/**
 * FR-006 zero-noise skip for the sole-membership branch (US-E23.2). The RSC
 * page CANNOT invoke `switchTenantAction` during render — cookie writes are
 * only legal inside a real Server Action invocation — so the auto-switch runs
 * client-side on mount instead: skeleton while the action mints the
 * tenant-scoped token, redirect on success, this screen's error state on
 * failure.
 */
export function AutoSwitchTenant({
  tenantId,
  role,
  onSwitchTenant,
}: {
  tenantId: string;
  role: string;
  onSwitchTenant: Props["onSwitchTenant"];
}) {
  const t = useTranslations("tenant.switch.postLogin");
  const [failed, setFailed] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return; // strict-mode double-mount guard
    fired.current = true;
    void runSwitchActivation(tenantId, role, {
      onSwitchTenant,
      onLoading: () => {},
      onForbidden: () => setFailed(true),
      onGenericError: () => setFailed(true),
    });
  }, [tenantId, role, onSwitchTenant]);

  if (failed) {
    return (
      <SelectTenant
        screenState={{ kind: "error" }}
        onSwitchTenant={onSwitchTenant}
      />
    );
  }
  return <SelectTenantSkeleton loadingLabel={t("loadingLabel")} />;
}
