"use client";

import { Check, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GroupKind } from "@/features/messaging/domain/entities/group.entity";
import { avatarToneClasses } from "@/features/messaging/presentation/avatar-tone";
import { cn } from "@/shared/utils";
import {
  GROUP_COLOR_SWATCHES,
  previewInitials,
  resolveSwatchColor,
} from "./color-swatches";
import type {
  CreateGroupModalActions,
  CreateGroupModalVM,
} from "./create-group-modal.i-vm";

export interface CreateGroupModalProps
  extends CreateGroupModalVM,
    CreateGroupModalActions {}

const KINDS = [
  { value: "class", labelKey: "typeClass" },
  { value: "dept", labelKey: "typeDept" },
  { value: "club", labelKey: "typeClub" },
  { value: "other", labelKey: "typeOther" },
] as const satisfies readonly { value: GroupKind; labelKey: string }[];

export function CreateGroupModal({
  open,
  contacts,
  isSubmitting,
  submitError,
  onOpenChange,
  onSubmit,
}: CreateGroupModalProps) {
  const t = useTranslations("messaging.group");
  const tErrors = useTranslations("messaging.errors");
  const nameId = useId();
  const errId = useId();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<GroupKind>("class");
  const [color, setColor] = useState<string>("primary");
  const [nameTouched, setNameTouched] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const nameInvalid = name.trim().length < 2;
  const showNameError = nameTouched && nameInvalid;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [contacts, search]);

  const selected = useMemo(
    () => contacts.filter((c) => memberIds.includes(c.id)),
    [contacts, memberIds],
  );

  const reset = () => {
    setStep(1);
    setName("");
    setDescription("");
    setKind("class");
    setColor("primary");
    setNameTouched(false);
    setMemberIds([]);
    setSearch("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const toggleMember = (id: string) =>
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleNext = () => {
    setNameTouched(true);
    if (nameInvalid) return;
    setStep(2);
  };

  const handleSubmit = () => {
    if (memberIds.length < 1) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      kind,
      color,
      memberIds,
    });
  };

  const previewColor = resolveSwatchColor(color);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-[460px]"
        aria-labelledby={`${nameId}-step-title`}
      >
        <div className="border-border border-b px-5 py-4">
          <DialogTitle
            id={`${nameId}-step-title`}
            className="font-extrabold text-foreground text-lg"
          >
            {step === 1 ? t("stepInfo") : t("stepMembers")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            {t("createTitle")}
          </DialogDescription>

          {/* Step indicator */}
          <ol className="mt-3 flex items-center gap-2" aria-hidden="true">
            {[1, 2].map((s) => {
              const isActive = step === s;
              const isDone = step > s;
              return (
                <li key={s} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full font-bold text-xs",
                      isDone
                        ? "bg-edu-success text-edu-success-foreground"
                        : isActive
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-background text-muted-foreground",
                    )}
                  >
                    {isDone ? <Check className="size-3.5" /> : s}
                  </span>
                  {s === 1 && <span className="h-px w-6 bg-border" />}
                </li>
              );
            })}
          </ol>
        </div>

        {submitError && (
          <div
            role="alert"
            className="mx-5 mt-4 rounded-lg border border-edu-error/30 bg-edu-error-light px-3 py-2 text-edu-error-text text-sm"
          >
            {tErrors("create-group-failed")}
          </div>
        )}

        {step === 1 ? (
          <div className="space-y-4 px-5 py-4">
            {/* Live avatar preview */}
            <div className="flex justify-center">
              <span
                style={{
                  backgroundColor: `${previewColor}20`,
                  borderColor: `${previewColor}55`,
                  color: previewColor,
                }}
                className="flex size-14 items-center justify-center rounded-[14px] border-2 font-extrabold text-lg"
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
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setNameTouched(true)}
                placeholder={t("namePlaceholder")}
                aria-invalid={showNameError || undefined}
                aria-describedby={showNameError ? errId : undefined}
                className="w-full rounded-lg border-[1.5px] border-border bg-background px-3 py-2 text-foreground text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              />
              {showNameError && (
                <p id={errId} className="mt-1 text-edu-error text-xs">
                  {t("nameLabel")} — {t("namePlaceholder")}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${nameId}-desc`}
                className="mb-1 block font-bold text-[12px] text-muted-foreground uppercase tracking-wide"
              >
                {t("descLabel")}
              </label>
              <textarea
                id={`${nameId}-desc`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descPlaceholder")}
                maxLength={140}
                rows={2}
                className="w-full resize-none rounded-lg border-[1.5px] border-border bg-background px-3 py-2 text-foreground text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <fieldset>
              <legend className="mb-1.5 block font-bold text-[12px] text-muted-foreground uppercase tracking-wide">
                {t("typeLabel")}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    aria-pressed={kind === k.value}
                    onClick={() => setKind(k.value)}
                    className={cn(
                      "rounded-lg border-[1.5px] px-3 py-2 text-left font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      kind === k.value
                        ? "border-primary bg-primary/12 text-primary"
                        : "border-border text-foreground hover:bg-muted",
                    )}
                  >
                    {t(k.labelKey)}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1.5 block font-bold text-[12px] text-muted-foreground uppercase tracking-wide">
                {t("colorLabel")}
              </legend>
              <div className="flex flex-wrap gap-2.5">
                {GROUP_COLOR_SWATCHES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={color === s.value}
                    aria-label={s.value}
                    onClick={() => setColor(s.value)}
                    style={{ backgroundColor: s.cssColor }}
                    className={cn(
                      "size-8 rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      color === s.value
                        ? "ring-2 ring-foreground ring-offset-2"
                        : "hover:scale-110",
                    )}
                  >
                    {color === s.value && (
                      <Check
                        className="mx-auto size-4 text-white"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ) : (
          <div className="space-y-3 px-5 py-4">
            {/* Selected chips */}
            <div className="min-h-[28px]">
              {selected.length > 0 ? (
                <>
                  <p className="mb-1.5 text-muted-foreground text-xs">
                    {t("selectedCount", { count: selected.length })}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.map((c) => (
                      <span
                        key={c.id}
                        className="flex items-center gap-1.5 rounded-full bg-muted py-1 pr-1 pl-2"
                      >
                        <span
                          className={cn(
                            "flex size-[18px] items-center justify-center rounded-full text-[9px] font-bold",
                            avatarToneClasses(c.color),
                          )}
                          aria-hidden="true"
                        >
                          {c.avatarInitials}
                        </span>
                        <span className="font-semibold text-foreground text-xs">
                          {c.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleMember(c.id)}
                          aria-label={t("removeChip", { name: c.name })}
                          className="flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-edu-error-light hover:text-edu-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <X className="size-3" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <div className="relative">
              <Search
                className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              <label htmlFor={`${nameId}-search`} className="sr-only">
                {t("searchMembersPlaceholder")}
              </label>
              <input
                id={`${nameId}-search`}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchMembersPlaceholder")}
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
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
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
                  {t("noMembersFound")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-border border-t px-5 py-4">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-border px-4 py-2 font-semibold text-foreground text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("prevStep")}
            </button>
          ) : (
            <span />
          )}
          {step === 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={nameInvalid}
              className="rounded-lg bg-primary px-5 py-2 font-semibold text-primary-foreground text-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("nextStep")}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={memberIds.length < 1 || isSubmitting}
              className="rounded-lg bg-primary px-5 py-2 font-semibold text-primary-foreground text-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("createButton")}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
