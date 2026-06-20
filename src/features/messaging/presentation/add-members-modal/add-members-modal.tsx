"use client";

import { Check, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { avatarToneClasses } from "@/features/messaging/presentation/avatar-tone";
import { cn } from "@/shared/utils";
import type {
  AddMemberModalActions,
  AddMemberModalVM,
} from "./add-members-modal.i-vm";

export interface AddMembersModalProps
  extends AddMemberModalVM,
    AddMemberModalActions {}

/**
 * DEF-02 — adds members to an existing group. Reuses the CreateGroupModal
 * step-2 contact-picker pattern (avatar + name + checkbox). Single-screen
 * (MessagingScreen) per component-organization rule.
 */
export function AddMembersModal({
  open,
  contacts,
  isSubmitting,
  submitError,
  onOpenChange,
  onSubmit,
}: AddMembersModalProps) {
  const t = useTranslations("messaging.addMembersModal");
  const titleId = useId();
  const errId = useId();
  const searchId = useId();

  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  // Reset transient selection whenever the modal closes.
  useEffect(() => {
    if (!open) {
      setMemberIds([]);
      setSearch("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [contacts, search]);

  const toggleMember = (id: string) =>
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSubmit = () => {
    if (memberIds.length < 1 || isSubmitting) return;
    onSubmit(memberIds);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-[420px]"
        aria-labelledby={titleId}
        aria-describedby={submitError ? errId : undefined}
      >
        <div className="border-border border-b px-5 py-4">
          <DialogTitle
            id={titleId}
            className="font-extrabold text-foreground text-lg"
          >
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            {t("subtitle")}
          </DialogDescription>
        </div>

        {submitError && (
          <div
            id={errId}
            role="alert"
            className="mx-5 mt-4 rounded-lg border border-edu-error/30 bg-edu-error-light px-3 py-2 text-edu-error-text text-sm"
          >
            {t("error")}
          </div>
        )}

        <div className="space-y-3 px-5 py-4">
          {memberIds.length > 0 && (
            <p className="text-muted-foreground text-xs">
              {t("selectedCount", { count: memberIds.length })}
            </p>
          )}

          <div className="relative">
            <Search
              className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor={searchId} className="sr-only">
              {t("searchPlaceholder")}
            </label>
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-lg border-[1.5px] border-border bg-background py-2 pr-2.5 pl-8 text-foreground text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="max-h-[240px] overflow-y-auto rounded-lg border border-border">
            {filtered.length > 0 ? (
              <ul>
                {filtered.map((c) => {
                  const checked = memberIds.includes(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => toggleMember(c.id)}
                        aria-pressed={checked}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                      >
                        <span
                          className={cn(
                            "flex size-[18px] flex-shrink-0 items-center justify-center rounded-[5px] border-[1.5px]",
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border",
                          )}
                          aria-hidden="true"
                        >
                          {checked && <Check className="size-3" />}
                        </span>
                        <span
                          className={cn(
                            "flex size-8 flex-shrink-0 items-center justify-center rounded-full font-bold text-[11px]",
                            avatarToneClasses(c.color),
                          )}
                          aria-hidden="true"
                        >
                          {c.avatarInitials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-foreground text-sm">
                            {c.name}
                          </span>
                          <span className="block truncate text-muted-foreground text-xs">
                            {c.role}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-3 py-6 text-center text-muted-foreground text-[12.5px]">
                {t("noContacts")}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-border border-t px-5 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2 font-semibold text-foreground text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={memberIds.length < 1 || isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-semibold text-primary-foreground text-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            {t("submit")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
