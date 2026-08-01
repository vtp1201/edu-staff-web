"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import type { ExamBuilderBlockReason } from "../../domain/use-cases/resolve-builder-access";

const EXAM_BANK_LIST_PATH = "/teacher/exam-bank";

/**
 * Body copy per block reason (`resolve-builder-access.ts`):
 *  - `create` — real mode has no create-with-questions endpoint (unchanged).
 *  - `not-draft` — the paper is published/confidential, immutable server-side.
 *  - `not-author` — someone else's paper (the server would 403 too).
 */
const REASON_BODY_KEY = {
  create: "unavailable.body",
  "not-draft": "unavailable.notDraftBody",
  "not-author": "unavailable.notAuthorBody",
} as const;

/**
 * Blocked-builder state. Since core US-152 (US-E18.28) editing an owned DRAFT
 * IS wired, so this now explains a specific reason instead of a blanket "not
 * available". Reuses the canonical shared EmptyState (component-organization.md).
 */
export function ExamBuilderUnavailable({
  reason = "create",
}: {
  reason?: ExamBuilderBlockReason;
} = {}) {
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
        body={t(REASON_BODY_KEY[reason])}
        cta={{
          label: t("unavailable.back"),
          variant: "secondary",
          onClick: () => router.push(EXAM_BANK_LIST_PATH),
        }}
      />
    </div>
  );
}
