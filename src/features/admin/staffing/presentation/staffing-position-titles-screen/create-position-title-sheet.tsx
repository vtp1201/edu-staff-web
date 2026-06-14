"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  Permission,
  PositionTitle,
  ScopeType,
} from "../../domain/entities/position-title.entity";
import {
  ALL_PERMISSIONS,
  type PositionTitleActionResult,
} from "./staffing-position-titles-screen.i-vm";

const MAX_NAME = 100;
const PERM_LABEL_KEY = {
  MANAGE_SUBJECT_CONTENT: "permManageSubjectContent",
  MANAGE_SCHEDULE: "permManageSchedule",
  MANAGE_CONDUCT: "permManageConduct",
  VIEW_REPORTS: "permViewReports",
} as const satisfies Record<Permission, string>;

interface CreatePositionTitleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the sheet edits permissions of an existing title. */
  target?: PositionTitle | null;
  onSubmit: (data: {
    name: string;
    scopeType: ScopeType;
    permissions: Permission[];
  }) => Promise<PositionTitleActionResult>;
}

export function CreatePositionTitleSheet({
  open,
  onOpenChange,
  target,
  onSubmit,
}: CreatePositionTitleSheetProps) {
  const t = useTranslations("staffing.positionTitles.createSheet");
  const tRoot = useTranslations("staffing.positionTitles");
  const tErrors = useTranslations("staffing.positionTitles.formErrors");
  const nameId = useId();
  const nameErrorId = useId();
  const scopeId = useId();
  const permFieldPrefix = useId();

  const isEdit = Boolean(target);
  const [name, setName] = useState(target?.name ?? "");
  const [scopeType, setScopeType] = useState<ScopeType>(
    target?.scopeType ?? "SUBJECT_PARENT",
  );
  const [permissions, setPermissions] = useState<Permission[]>(
    target?.permissions ?? [],
  );
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on target identity / open change
  useEffect(() => {
    setName(target?.name ?? "");
    setScopeType(target?.scopeType ?? "SUBJECT_PARENT");
    setPermissions(target?.permissions ?? []);
    setSubmitted(false);
  }, [target?.id, open]);

  const trimmed = name.trim();
  const emptyError = submitted && trimmed.length === 0;
  const tooLongError = submitted && trimmed.length > MAX_NAME;
  const valid = trimmed.length > 0 && trimmed.length <= MAX_NAME;

  const togglePermission = (perm: Permission, checked: boolean) => {
    setPermissions((prev) => {
      if (checked) return prev.includes(perm) ? prev : [...prev, perm];
      return prev.filter((p) => p !== perm);
    });
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!valid) return;
    // MANAGE_SUBJECT_CONTENT only valid for SUBJECT_PARENT scope (domain rule).
    const cleanedPerms =
      scopeType === "SUBJECT_PARENT"
        ? permissions
        : permissions.filter((p) => p !== "MANAGE_SUBJECT_CONTENT");
    setSubmitting(true);
    const result = await onSubmit({
      name: trimmed,
      scopeType,
      permissions: cleanedPerms,
    });
    setSubmitting(false);
    if (result.ok) onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-6 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? t("editTitle") : t("title")}</SheetTitle>
          <SheetDescription className="sr-only">
            {t("description")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={nameId}>{t("nameLabel")}</Label>
            <Input
              id={nameId}
              required
              aria-required="true"
              disabled={isEdit}
              maxLength={MAX_NAME + 1}
              aria-invalid={emptyError || tooLongError || undefined}
              aria-describedby={
                emptyError || tooLongError ? nameErrorId : undefined
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
            {(emptyError || tooLongError) && (
              <p
                id={nameErrorId}
                role="alert"
                className="text-xs text-edu-error-text"
              >
                {emptyError ? tErrors("nameRequired") : tErrors("nameTooLong")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={scopeId}>{t("scopeTypeLabel")}</Label>
            <Select
              value={scopeType}
              onValueChange={(v) => setScopeType(v as ScopeType)}
              disabled={isEdit}
            >
              <SelectTrigger id={scopeId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUBJECT_PARENT">
                  {tRoot("scopeTypeSubjectParent")}
                </SelectItem>
                <SelectItem value="DEPARTMENT">
                  {tRoot("scopeTypeDepartment")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <fieldset className="flex flex-col gap-3 border-0 p-0">
            <legend className="text-sm font-medium text-foreground">
              {t("permissionsLabel")}
            </legend>
            {ALL_PERMISSIONS.map((perm) => {
              const disabled =
                perm === "MANAGE_SUBJECT_CONTENT" &&
                scopeType !== "SUBJECT_PARENT";
              const checked = permissions.includes(perm) && !disabled;
              const checkboxId = `${permFieldPrefix}-${perm}`;
              return (
                <div key={perm} className="flex items-center gap-2.5">
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(c) => togglePermission(perm, c === true)}
                  />
                  <Label
                    htmlFor={checkboxId}
                    className="text-sm font-normal text-foreground"
                  >
                    {tRoot(PERM_LABEL_KEY[perm])}
                  </Label>
                </div>
              );
            })}
          </fieldset>
        </div>

        <SheetFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {isEdit ? t("editSubmit") : t("submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
