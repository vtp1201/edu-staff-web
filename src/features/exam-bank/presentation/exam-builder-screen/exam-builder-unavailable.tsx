"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";

const EXAM_BANK_LIST_PATH = "/teacher/exam-bank";

/**
 * Blocked-builder state (real mode, US-E18.15/ADR 0056). The real core contract
 * has no create-with-questions / metadata-update / delete endpoint, so the
 * builder routes render this explanatory state instead of a form that would fail
 * on submit. Reuses the canonical shared EmptyState (component-organization.md).
 */
export function ExamBuilderUnavailable() {
  const t = useTranslations("examBank");
  const router = useRouter();

  return (
    <div className="grid flex-1 place-items-center p-6">
      <EmptyState
        icon={Lock}
        title={t("unavailable.title")}
        body={t("unavailable.body")}
        cta={{
          label: t("unavailable.back"),
          variant: "secondary",
          onClick: () => router.push(EXAM_BANK_LIST_PATH),
        }}
      />
    </div>
  );
}
