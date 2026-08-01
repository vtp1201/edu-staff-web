import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { InvitationsStatusFilter } from "./invitations-screen.i-vm";

const ORDER: InvitationsStatusFilter[] = [
  "all",
  "pending",
  "accepted",
  "expired",
  "revoked",
];

export interface InvitationsStatusTabsProps {
  value: InvitationsStatusFilter;
  labels: Record<InvitationsStatusFilter, string>;
  onChange: (value: InvitationsStatusFilter) => void;
}

/**
 * Visual status tablist (shadcn Tabs → Radix `role="tablist"`/`tab`, arrow-key
 * nav inherited). Non-panel-switching usage: selecting a tab swaps the list
 * query's key (server-side `status` filter), so there is no `TabsContent`.
 *
 * NO COUNT BADGES (removed in US-E18.29, deliberate): with real cursor
 * pagination each tab is its OWN lazily-fetched query, so a number for a tab the
 * admin has never opened would be either fabricated (prefetching all 5 tabs) or
 * stale — worse than no number on an admin surface. Each tab's accessible name
 * is therefore its label text alone.
 */
export function InvitationsStatusTabs({
  value,
  labels,
  onChange,
}: InvitationsStatusTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as InvitationsStatusFilter)}
    >
      <TabsList className="h-11 flex-wrap sm:h-9">
        {ORDER.map((key) => (
          <TabsTrigger key={key} value={key} className="max-[820px]:py-2.5">
            {labels[key]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
