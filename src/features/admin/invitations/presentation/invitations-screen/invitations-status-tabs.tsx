import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/shared/utils";
import type {
  InvitationsStatusCounts,
  InvitationsStatusFilter,
} from "./invitations-screen.i-vm";

const ORDER: InvitationsStatusFilter[] = [
  "all",
  "pending",
  "accepted",
  "expired",
  "revoked",
];

export interface InvitationsStatusTabsProps {
  value: InvitationsStatusFilter;
  counts: InvitationsStatusCounts;
  labels: Record<InvitationsStatusFilter, string>;
  onChange: (value: InvitationsStatusFilter) => void;
}

/**
 * Visual status tablist (shadcn Tabs → Radix `role="tablist"`/`tab`, arrow-key
 * nav inherited). Non-panel-switching usage: the container filters the list
 * client-side, so no `TabsContent`. The count badge is part of each tab's
 * accessible name (not a decorative-only number).
 */
export function InvitationsStatusTabs({
  value,
  counts,
  labels,
  onChange,
}: InvitationsStatusTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as InvitationsStatusFilter)}
    >
      <TabsList className="flex-wrap">
        {ORDER.map((key) => (
          <TabsTrigger key={key} value={key} className="gap-1.5">
            {labels[key]}
            <span
              className={cn(
                "inline-flex min-w-4 items-center justify-center rounded-full px-1.5 py-px font-extrabold text-[10px]",
                value === key
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {counts[key]}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
