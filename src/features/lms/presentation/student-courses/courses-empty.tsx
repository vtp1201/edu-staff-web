import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export interface CoursesEmptyProps {
  /** Already-translated per-tab empty copy chosen by the parent. */
  title: string;
}

/** Per-tab empty state — wraps the canonical shared EmptyState. */
export function CoursesEmpty({ title }: CoursesEmptyProps) {
  return (
    <div className="rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <EmptyState icon={BookOpen} title={title} />
    </div>
  );
}
