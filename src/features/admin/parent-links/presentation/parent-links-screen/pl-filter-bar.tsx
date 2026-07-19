import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClassOption } from "./parent-links-screen.i-vm";

/** Sentinel value for the "all classes" option (Radix Select disallows ""). */
const ALL_CLASSES = "__all__";

export interface PLFilterBarProps {
  q: string;
  classId: string | null;
  classOptions: ClassOption[];
  searchPlaceholder: string;
  searchAriaLabel: string;
  classFilterAriaLabel: string;
  allClassesLabel: string;
  clearFiltersLabel: string;
  hasActiveFilter: boolean;
  onQChange: (q: string) => void;
  onClassChange: (classId: string | null) => void;
  onClearFilters: () => void;
}

/**
 * Search + class filter (FR-002). The search Input is controlled by the
 * container's draft (keystroke buffer); the container debounces draft→URL
 * (audit-log precedent). Class Select uses a sentinel for "all" (Radix forbids
 * an empty item value).
 */
export function PLFilterBar({
  q,
  classId,
  classOptions,
  searchPlaceholder,
  searchAriaLabel,
  classFilterAriaLabel,
  allClassesLabel,
  clearFiltersLabel,
  hasActiveFilter,
  onQChange,
  onClassChange,
  onClearFilters,
}: PLFilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-55 flex-1 md:max-w-95">
        <Search
          className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchAriaLabel}
          className="pl-9"
        />
      </div>

      <Select
        value={classId ?? ALL_CLASSES}
        onValueChange={(v) => onClassChange(v === ALL_CLASSES ? null : v)}
      >
        <SelectTrigger
          aria-label={classFilterAriaLabel}
          className="w-auto min-w-40"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CLASSES}>{allClassesLabel}</SelectItem>
          {classOptions.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilter && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearFilters}
        >
          <X className="size-4" aria-hidden="true" />
          {clearFiltersLabel}
        </Button>
      )}
    </div>
  );
}
