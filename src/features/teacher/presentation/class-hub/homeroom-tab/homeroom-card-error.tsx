import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export interface HomeroomCardErrorProps {
  icon: LucideIcon;
  /** Already-translated. */
  title: string;
  /** Already-translated. */
  body: string;
  /** Already-translated. */
  retryLabel: string;
  /** The tab's OWN url — re-navigating re-runs the RSC read. */
  retryHref: string;
}

/**
 * The one error surface all three homeroom cards share (US-E24.11).
 *
 * "Thử lại" is a real `<a>` back to `?tab=homeroom`, not a client handler: a
 * plain GET re-executes the route's `Promise.allSettled`, which is exactly what
 * a retry means here. That keeps two of the three cards free of any client
 * bundle at all.
 *
 * `EmptyState` carries `role="status"`, so the failure is announced on render.
 */
export function HomeroomCardError({
  icon,
  title,
  body,
  retryLabel,
  retryHref,
}: HomeroomCardErrorProps) {
  return (
    <section className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <EmptyState icon={icon} title={title} body={body} className="py-8" />
      <div className="px-5 pb-5">
        <Button asChild variant="outline" className="w-full">
          <Link href={retryHref}>{retryLabel}</Link>
        </Button>
      </div>
    </section>
  );
}
