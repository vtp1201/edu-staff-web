"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { avatarToneClasses } from "@/features/messaging/presentation/avatar-tone";
import { cn } from "@/shared/utils";
import type {
  CreateGroupModalActions,
  CreateGroupModalVM,
} from "./create-group-modal.i-vm";

export interface CreateGroupModalProps
  extends CreateGroupModalVM,
    CreateGroupModalActions {}

/** Matches `CreateGroupUseCase` (≥2) and the wire cap (`maxLength: 255`). */
const MIN_NAME = 2;
const MAX_NAME = 255;

/** First letters (max 3) of the typed name, for the live avatar preview. */
function previewInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * US-E18.50 — a single-step, name-only form. The previous two-step flow
 * collected a description, a kind, a colour swatch and an initial member list;
 * the real contract (BE US-193, ADR 0132) accepts NONE of them, so keeping
 * those controls would have meant a form whose choices silently evaporate.
 * The group avatar colour is derived from the created room id server-side-ish
 * (same `roomColorKey` rotation used by the conversation list), so the preview
 * here shows the neutral primary tone rather than promising a chosen colour.
 * Members are added afterwards through the add-members modal.
 */
export function CreateGroupModal({
  open,
  isSubmitting,
  submitError,
  onOpenChange,
  onSubmit,
}: CreateGroupModalProps) {
  const t = useTranslations("messaging.group");
  const tErrors = useTranslations("messaging.errors");
  const tCommon = useTranslations("messaging.addMembersModal");
  const nameId = useId();
  const errId = useId();

  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);

  const trimmed = name.trim();
  const nameInvalid = trimmed.length < MIN_NAME || trimmed.length > MAX_NAME;
  const showNameError = nameTouched && nameInvalid;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName("");
      setNameTouched(false);
    }
    onOpenChange(next);
  };

  const handleSubmit = () => {
    setNameTouched(true);
    if (nameInvalid || isSubmitting) return;
    onSubmit({ name: trimmed });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 p-0 [&>*]:min-w-0 sm:max-w-[420px]">
        <div className="border-border border-b px-5 py-4">
          <DialogTitle className="font-extrabold text-foreground text-lg">
            {t("createTitle")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            {t("membersAfterCreate")}
          </DialogDescription>
        </div>

        {submitError && (
          <div
            role="alert"
            className="mx-5 mt-4 rounded-lg border border-edu-error/30 bg-edu-error-light px-3 py-2 text-edu-error-text text-sm"
          >
            {tErrors(submitError)}
          </div>
        )}

        <div className="space-y-4 px-5 py-4">
          {/* Live avatar preview — tone is derived after creation, so the
              preview deliberately shows the neutral brand tone. */}
          <div className="flex justify-center">
            <span
              className={cn(
                "flex size-14 items-center justify-center rounded-[14px] font-extrabold text-lg",
                avatarToneClasses("primary"),
              )}
              aria-hidden="true"
            >
              {previewInitials(name)}
            </span>
          </div>

          <div>
            <label
              htmlFor={nameId}
              className="mb-1 block font-bold text-[12px] text-muted-foreground uppercase tracking-wide"
            >
              {t("nameLabel")}
            </label>
            <input
              id={nameId}
              value={name}
              maxLength={MAX_NAME}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder={t("namePlaceholder")}
              aria-invalid={showNameError || undefined}
              aria-describedby={showNameError ? errId : undefined}
              className="w-full rounded-lg border-[1.5px] border-border bg-background px-3 py-2 text-foreground text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
            {showNameError && (
              <p id={errId} className="mt-1 text-edu-error-text text-xs">
                {t("nameTooShort")}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-border border-t px-5 py-4">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="min-h-11 rounded-lg border border-border px-4 py-2 font-semibold text-foreground text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={nameInvalid || isSubmitting}
            className="min-h-11 rounded-lg bg-primary px-5 py-2 font-semibold text-primary-foreground text-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("createButton")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
