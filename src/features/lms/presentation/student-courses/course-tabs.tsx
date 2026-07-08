import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CourseCardVm, CourseTab } from "./student-courses-screen.i-vm";

export interface CourseTabsProps {
  courses: CourseCardVm[];
  activeTab: CourseTab;
  onTabChange: (tab: CourseTab) => void;
  labels: { all: string; inProgress: string; completed: string };
}

/** Controlled 3-tab filter. Counts derived from the same list it filters. */
export function CourseTabs({
  courses,
  activeTab,
  onTabChange,
  labels,
}: CourseTabsProps) {
  const counts = {
    all: courses.length,
    "in-progress": courses.filter((c) => c.status === "in-progress").length,
    completed: courses.filter((c) => c.status === "completed").length,
  } satisfies Record<CourseTab, number>;

  const tabs: Array<{ id: CourseTab; label: string }> = [
    { id: "all", label: labels.all },
    { id: "in-progress", label: labels.inProgress },
    { id: "completed", label: labels.completed },
  ];

  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as CourseTab)}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
            {tab.label}
            <span className="rounded-full bg-edu-bg px-1.5 py-px font-extrabold text-[10px] text-edu-text-secondary tabular-nums">
              {counts[tab.id]}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
