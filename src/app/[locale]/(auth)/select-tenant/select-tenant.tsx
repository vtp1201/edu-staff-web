"use client";

import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import type { SwitchTenantResult } from "@/components/shared/tenant-card";
import { Button } from "@/components/ui/button";
import type { TenantMembership } from "@/features/tenant/domain/entities/tenant-membership.entity";

type Props = {
  memberships: TenantMembership[];
  /** Path A (US-E23.1): `switchTenantAction` returns a discriminated result and
   *  redirects on success. This caller ignores the return value (it has no
   *  try/catch); the type just tracks the shared action signature. */
  onSelect: (tenantId: string, role: string) => Promise<SwitchTenantResult>;
};

export function SelectTenant({ memberships, onSelect }: Props) {
  const t = useTranslations("tenant.select");
  const [isPending, startTransition] = useTransition();

  if (memberships.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {memberships.map((m) => (
        <li
          key={m.tenantId}
          className="flex items-center gap-3 rounded-[var(--edu-radius-card)] border border-border bg-card p-4"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-[var(--edu-radius-role-icon)] bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold text-sm">{m.tenantId}</div>
            <div className="truncate text-xs text-muted-foreground">
              {t("roles")}: {m.roles.join(", ") || "—"}
            </div>
          </div>
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(() => {
                void onSelect(m.tenantId, m.roles[0] ?? "");
              })
            }
          >
            {isPending ? t("switching") : t("enter")}
          </Button>
        </li>
      ))}
    </ul>
  );
}
