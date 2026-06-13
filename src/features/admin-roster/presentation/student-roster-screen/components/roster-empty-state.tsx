"use client";

import { Plus, Upload, User, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface RosterEmptyStateProps {
  onAddFirstClick: () => void;
}

export function RosterEmptyState({ onAddFirstClick }: RosterEmptyStateProps) {
  const t = useTranslations("adminRoster");

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-edu-border bg-edu-card px-8 py-14 text-center shadow-card">
      <div className="relative flex size-[120px] items-center justify-center rounded-full bg-edu-primary/[0.08]">
        <User
          className="absolute top-9 left-5 size-9 text-edu-primary/50"
          aria-hidden="true"
        />
        <User
          className="absolute top-9 right-5 size-9 text-edu-primary/50"
          aria-hidden="true"
        />
        <UserCheck
          className="relative z-10 size-[52px] text-edu-primary"
          aria-hidden="true"
        />
      </div>
      <div>
        <h3 className="mb-1.5 font-extrabold text-edu-text-primary text-lg">
          {t("empty.title")}
        </h3>
        <p className="max-w-sm text-edu-text-muted text-sm leading-relaxed">
          {t("empty.body")}
        </p>
      </div>
      <div className="mt-1 flex flex-wrap justify-center gap-2.5">
        <Button onClick={onAddFirstClick}>
          <Plus className="size-4" aria-hidden="true" />
          {t("empty.addFirst")}
        </Button>
        <Button variant="secondary" disabled>
          <Upload className="size-4" aria-hidden="true" />
          {t("empty.importCsv")}
        </Button>
      </div>
    </div>
  );
}
