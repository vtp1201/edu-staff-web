"use client";

import { RotateCcw, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  type AuditAction,
  type AuditEntityType,
} from "../../../domain/entities/audit-event.entity";
import { DateRangeFields } from "./date-range-fields";

export interface AuditLogFilterDraft {
  entityType?: AuditEntityType;
  action?: AuditAction;
  actorQuery?: string;
  from?: string;
  to?: string;
}

export interface FilterBarProps {
  filters: AuditLogFilterDraft;
  onFilterChange: (patch: Partial<AuditLogFilterDraft>) => void;
  onReset: () => void;
}

// Radix Select forbids an empty-string item value; use a sentinel for "all".
const ALL = "__all__";

export function FilterBar({
  filters,
  onFilterChange,
  onReset,
}: FilterBarProps) {
  const t = useTranslations("auditLog.filters");
  const tEntity = useTranslations("auditLog.entityType");
  const tAction = useTranslations("auditLog.action");
  const actorId = useId();

  return (
    <fieldset className="flex flex-col gap-4 rounded-[var(--edu-radius-card)] border border-border bg-card p-4 shadow-card">
      <legend className="sr-only">{t("legend")}</legend>

      <div className="flex flex-wrap items-start gap-3">
        {/* Entity type — Radix combobox named via SelectTrigger aria-label. */}
        <div className="flex flex-col gap-1">
          <span className="font-bold text-edu-text-secondary text-xs uppercase tracking-wide">
            {t("entityType")}
          </span>
          <Select
            value={filters.entityType ?? ALL}
            onValueChange={(v) =>
              onFilterChange({
                entityType: v === ALL ? undefined : (v as AuditEntityType),
              })
            }
          >
            <SelectTrigger
              className="min-h-11 w-44"
              aria-label={t("entityTypeAriaLabel")}
            >
              <SelectValue placeholder={t("allEntityTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allEntityTypes")}</SelectItem>
              {AUDIT_ENTITY_TYPES.map((et) => (
                <SelectItem key={et} value={et}>
                  {tEntity(et)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action — Radix combobox named via SelectTrigger aria-label. */}
        <div className="flex flex-col gap-1">
          <span className="font-bold text-edu-text-secondary text-xs uppercase tracking-wide">
            {t("action")}
          </span>
          <Select
            value={filters.action ?? ALL}
            onValueChange={(v) =>
              onFilterChange({
                action: v === ALL ? undefined : (v as AuditAction),
              })
            }
          >
            <SelectTrigger
              className="min-h-11 w-44"
              aria-label={t("actionAriaLabel")}
            >
              <SelectValue placeholder={t("allActions")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allActions")}</SelectItem>
              {AUDIT_ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {tAction(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Actor search */}
        <label htmlFor={actorId} className="flex flex-col gap-1">
          <span className="font-bold text-edu-text-secondary text-xs uppercase tracking-wide">
            {t("actor")}
          </span>
          <div className="relative">
            <Search
              className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id={actorId}
              type="search"
              value={filters.actorQuery ?? ""}
              onChange={(e) =>
                onFilterChange({ actorQuery: e.target.value || undefined })
              }
              placeholder={t("actorPlaceholder")}
              aria-label={t("actorAriaLabel")}
              className="min-h-11 w-56 pl-9"
            />
          </div>
        </label>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-dashed border-border pt-4">
        <DateRangeFields
          from={filters.from}
          to={filters.to}
          onFromChange={(v) => onFilterChange({ from: v || undefined })}
          onToChange={(v) => onFilterChange({ to: v || undefined })}
        />
        <Button type="button" variant="outline" onClick={onReset}>
          <RotateCcw className="size-4" aria-hidden="true" />
          {t("reset")}
        </Button>
      </div>
    </fieldset>
  );
}
