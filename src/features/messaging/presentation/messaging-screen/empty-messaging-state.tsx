"use client";

import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";

export interface EmptyMessagingStateProps {
  onStart?: () => void;
}

export function EmptyMessagingState({ onStart }: EmptyMessagingStateProps) {
  const t = useTranslations("messaging.empty");
  return (
    <EmptyState
      // The chat pane is a flex row container; grow to fill it and center the
      // column vertically (the shared EmptyState only centers horizontally).
      className="flex-1 justify-center"
      icon={MessageSquare}
      title={t("title")}
      body={t("subtitle")}
      cta={onStart ? { label: t("cta"), onClick: onStart } : undefined}
    />
  );
}
