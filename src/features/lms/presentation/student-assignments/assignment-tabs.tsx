import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AssignmentTab } from "./student-assignments-screen.i-vm";

export interface AssignmentTabsProps {
  activeTab: AssignmentTab;
  onTabChange: (tab: AssignmentTab) => void;
  groupLabel: string;
  labels: {
    all: string;
    pending: string;
    submitted: string;
    graded: string;
  };
}

/**
 * 4-tab status filter. Uses the shadcn/Radix `Tabs` primitive, which implements
 * the full WCAG APG tablist pattern out of the box (role=tablist/tab,
 * aria-selected, roving tabindex, arrow-key nav, Enter/Space activation). The
 * list region is unmounted/remounted on tab change by the parent (keyed by tab),
 * so `TabsContent` is intentionally not used here.
 */
export function AssignmentTabs({
  activeTab,
  onTabChange,
  groupLabel,
  labels,
}: AssignmentTabsProps) {
  const tabs: Array<{ id: AssignmentTab; label: string }> = [
    { id: "all", label: labels.all },
    { id: "pending", label: labels.pending },
    { id: "submitted", label: labels.submitted },
    { id: "graded", label: labels.graded },
  ];

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as AssignmentTab)}
      className="w-full"
    >
      <TabsList aria-label={groupLabel} className="max-w-full overflow-x-auto">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
