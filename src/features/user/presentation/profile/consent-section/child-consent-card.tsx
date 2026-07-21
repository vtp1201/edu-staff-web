"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, CalendarX, type LucideIcon, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ConsentCategory } from "@/features/parent-links/domain/repositories/i-parent-consent.repository";
import { ConsentToggleRow } from "./consent-toggle-row";
import { PARENT_CONSENT_QUERY_KEY } from "./parent-consent.query-keys";
import type {
  ParentConsentChildVM,
  ParentConsentToggleResult,
  UpdateConsentInput,
} from "./parent-consent-section.i-vm";

const CATEGORY_ICON: Record<ConsentCategory, LucideIcon> = {
  discipline: ShieldAlert,
  absence: CalendarX,
  grades: Award,
};

const CATEGORY_ORDER: ConsentCategory[] = ["discipline", "absence", "grades"];

function initialsOf(fullName: string): string {
  return fullName
    .split(" ")
    .map((p) => p[0])
    .slice(-2)
    .join("")
    .toUpperCase();
}

export interface ChildConsentCardProps {
  child: ParentConsentChildVM;
  onToggle: (input: UpdateConsentInput) => Promise<ParentConsentToggleResult>;
}

/**
 * One child-card — identity header + 3 consent toggles. Each toggle is its own
 * `ConsentToggleController` (own `useMutation`), so "exactly one
 * (studentId, category) pair mutates per interaction" (AC-004.2) is structural,
 * not enforced by application code.
 */
export function ChildConsentCard({ child, onToggle }: ChildConsentCardProps) {
  const t = useTranslations("parentLinks.consentSection");
  const pending = child.consent === null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3 rounded-lg bg-edu-bg px-3 py-2.5">
        <Avatar className="size-[38px]">
          {child.avatarUrl && (
            <AvatarImage src={child.avatarUrl} alt={child.fullName} />
          )}
          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
            {initialsOf(child.fullName)}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
          {child.fullName}
        </span>
        <StatusBadge tone="success">{t("childCard.linkedBadge")}</StatusBadge>
      </div>

      <div className="mt-3 space-y-3">
        {CATEGORY_ORDER.map((category) => (
          <ConsentToggleController
            key={category}
            studentId={child.studentId}
            category={category}
            checked={child.consent ? child.consent[category] : false}
            pending={pending}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Per-category controller — owns the optimistic mutation with `setQueryData`
 * patch/rollback (state-architecture §6). NO `invalidateQueries` on settle
 * (deliberate deviation — avoids stomping a different in-flight toggle). Toast
 * on success only; failure surfaces via inline `role="alert"` text + revert.
 */
function ConsentToggleController({
  studentId,
  category,
  checked,
  pending,
  onToggle,
}: {
  studentId: string;
  category: ConsentCategory;
  checked: boolean;
  pending: boolean;
  onToggle: (input: UpdateConsentInput) => Promise<ParentConsentToggleResult>;
}) {
  const t = useTranslations("parentLinks.consentSection");
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const patchCategory = (value: boolean) => {
    queryClient.setQueryData<ParentConsentChildVM[]>(
      PARENT_CONSENT_QUERY_KEY,
      (prev) =>
        prev?.map((c) =>
          c.studentId === studentId && c.consent
            ? { ...c, consent: { ...c.consent, [category]: value } }
            : c,
        ),
    );
  };

  const mutation = useMutation({
    mutationFn: (next: boolean) =>
      onToggle({ studentId, category, enabled: next }),
    onMutate: (next: boolean) => {
      setError(null);
      const previous = checked;
      patchCategory(next);
      return { previous };
    },
    onSuccess: (result, _next, context) => {
      if (!result.success) {
        patchCategory(context.previous);
        setError(t(`errors.${result.errorKey}`));
        return;
      }
      // Reconcile to the full server-echoed consent object (guards against the
      // server coupling other categories the client didn't predict).
      queryClient.setQueryData<ParentConsentChildVM[]>(
        PARENT_CONSENT_QUERY_KEY,
        (prev) =>
          prev?.map((c) =>
            c.studentId === studentId ? { ...c, consent: result.consent } : c,
          ),
      );
      toast.success(t("toast.success"));
    },
    onError: (_err, next, context) => {
      patchCategory(context?.previous ?? !next);
      setError(t("errors.network-error"));
    },
  });

  const saving = mutation.isPending;

  return (
    <ConsentToggleRow
      category={category}
      icon={CATEGORY_ICON[category]}
      label={t(`toggles.${category}.label`)}
      description={t(`toggles.${category}.description`)}
      checked={checked}
      pending={pending}
      saving={saving}
      errorText={error ?? undefined}
      onCheckedChange={(next) => {
        if (!saving) mutation.mutate(next);
      }}
    />
  );
}
