"use client";

import { CheckCircle2, Clock, FileEdit, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatCard } from "@/components/shared/stat-card";
import type { HomeroomEntry } from "../../../domain/entities/homeroom-entry.entity";

type Props = {
  entries: HomeroomEntry[];
  isPrincipal: boolean;
};

/** Stats row — teacher: pending/approved/draft; principal: pending/approved/rejected. */
export function ClassLogStatsRow({ entries, isPrincipal }: Props) {
  const t = useTranslations("classLog");
  const count = (s: HomeroomEntry["status"]) =>
    entries.filter((e) => e.status === s).length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label={t("stats.pending")}
        value={String(count("SUBMITTED"))}
        icon={Clock}
        tone="warning"
      />
      <StatCard
        label={t("stats.approved")}
        value={String(count("APPROVED"))}
        icon={CheckCircle2}
        tone="success"
      />
      {isPrincipal ? (
        <StatCard
          label={t("stats.rejected")}
          value={String(count("REJECTED"))}
          icon={XCircle}
          tone="error"
        />
      ) : (
        <StatCard
          label={t("stats.draft")}
          value={String(count("DRAFT"))}
          icon={FileEdit}
          tone="muted"
        />
      )}
    </div>
  );
}
