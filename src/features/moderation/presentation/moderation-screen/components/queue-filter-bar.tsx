"use client";

import { RefreshCw, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ReportContentTypeFilter,
  ReportQueueFilter,
  ReportStatusTab,
} from "../../../domain/entities/report-queue-filter.entity";

export interface QueueFilterBarProps {
  filter: ReportQueueFilter;
  onFilterChange: (patch: Partial<ReportQueueFilter>) => void;
  onRefresh: () => void;
}

const STATUS_TABS: ReportStatusTab[] = ["pending", "resolved", "all"];
const CONTENT_TYPES: ReportContentTypeFilter[] = [
  "all",
  "post",
  "comment",
  "message",
];

/** Status tabs + content-type select + free-text search (FR-104, AND). */
export function QueueFilterBar({
  filter,
  onFilterChange,
  onRefresh,
}: QueueFilterBarProps) {
  const t = useTranslations("moderation.filter");

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <Tabs
        value={filter.status}
        onValueChange={(v) => onFilterChange({ status: v as ReportStatusTab })}
      >
        <TabsList>
          {STATUS_TABS.map((s) => (
            <TabsTrigger key={s} value={s}>
              {t(`status.${s}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-1 items-center gap-2 md:max-w-md md:justify-end">
        <Select
          value={filter.contentType}
          onValueChange={(v) =>
            onFilterChange({ contentType: v as ReportContentTypeFilter })
          }
        >
          <SelectTrigger className="w-36" aria-label={t("typeLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPES.map((ct) => (
              <SelectItem key={ct} value={ct}>
                {t(`type.${ct}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Label htmlFor="moderation-search" className="sr-only">
            {t("searchLabel")}
          </Label>
          <Search
            aria-hidden="true"
            className="-translate-y-1/2 absolute top-1/2 left-2.5 size-4 text-muted-foreground"
          />
          <Input
            id="moderation-search"
            type="search"
            className="pl-8"
            placeholder={t("searchPlaceholder")}
            value={filter.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("refresh")}
          onClick={onRefresh}
        >
          <RefreshCw aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  );
}
