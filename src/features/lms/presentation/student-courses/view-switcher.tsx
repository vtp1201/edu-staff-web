import { BookOpen, Clipboard, FileText, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";
import type { CoursesView } from "./cross-subject.i-vm";

/** Fixed design decision, not per-request data — kept out of the ViewModel. */
const VIEW_ICON: Record<CoursesView, LucideIcon> = {
  all: BookOpen,
  assignment: Clipboard,
  exam: FileText,
};

const VIEWS: readonly CoursesView[] = ["all", "assignment", "exam"] as const;

export interface ViewSwitcherProps {
  view: CoursesView;
  /** Route-owned builder — only the route knows locale/tenant. */
  hrefFor: (view: CoursesView) => string;
}

/**
 * "Môn học · Bài tập · Bài kiểm tra" pill row (US-E24.4).
 *
 * Real anchors to `?view=<id>`: the URL IS the state, the server resolves it,
 * and back/forward work for free. Nothing client-side to toggle, so this stays
 * a server component.
 *
 * A `<nav>` with `aria-current="page"` rather than a tablist: these three are
 * separate ROUTES (each renders a different read), not panels of one widget —
 * the underline tablist inside the cross-subject list is the actual tab widget
 * (design-spec `crossSubjectList.subTabs`, and the shapes must not be confused
 * with each other on screen either).
 */
export function ViewSwitcher({ view, hrefFor }: ViewSwitcherProps) {
  const t = useTranslations("courses.views");

  return (
    <nav aria-label={t("navLabel")}>
      <ul className="flex flex-wrap gap-1.5">
        {VIEWS.map((id) => {
          const Icon = VIEW_ICON[id];
          const active = id === view;
          return (
            <li key={id}>
              <Link
                href={hrefFor(id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 py-2 font-bold text-[12.5px] outline-none motion-safe:transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-edu-text-secondary hover:bg-muted",
                )}
              >
                <Icon
                  className="size-3.5"
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
                {t(id)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
