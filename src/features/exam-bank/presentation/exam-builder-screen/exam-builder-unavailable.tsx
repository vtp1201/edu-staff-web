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
      {/* sr-only heading — this state replaces the whole builder route, but
       * EmptyState renders its title as a <p> (it's normally a sub-region of
       * an already-headed page). A11Y-201: give SR users navigating by
       * heading something to land on, matching exam-builder-screen.tsx's own
       * sr-only <h1>. */}
      <h1 className="sr-only">{t("unavailable.title")}</h1>
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
