"use client";

import { ChevronRight } from "lucide-react";
import { Link } from "@/bootstrap/i18n/routing";
import { ChildIdentityHeader } from "@/components/shared/child-identity-header";
import type { ChildOverviewCardVM } from "./children-overview-screen.i-vm";

export interface ChildOverviewCardProps {
  child: ChildOverviewCardVM;
  /** Tenant-scoped academic-record href, built by the screen. */
  href: string;
  /** Already-translated CTA label, e.g. "Xem học bạ". */
  ctaLabel: string;
  /**
   * Already-translated accessible name including the child's name — the CTA
   * label alone repeats across cards and would be ambiguous out of context
   * (WCAG 2.4.4 / 2.4.9).
   */
  ariaLabel: string;
}

/**
 * One linked child (US-E20.4). The WHOLE card is a single native `<Link>`, so
 * it is one tab stop, Enter-activatable and focus-ring-visible for free — no
 * div-with-onClick, no nested interactive elements (AC-005).
 *
 * Identity comes from the shared `ChildIdentityHeader` (decision 0026) — no
 * consent state is rendered here (AC-004).
 */
export function ChildOverviewCard({
  child,
  href,
  ctaLabel,
  ariaLabel,
}: ChildOverviewCardProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="flex min-h-11 flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
    >
      <ChildIdentityHeader
        fullName={child.fullName}
        avatarUrl={child.avatarUrl}
        size="lg"
        tone="purple"
        initials="single"
      />
      <span className="flex items-center gap-1 text-sm font-bold text-primary">
        {ctaLabel}
        <ChevronRight className="size-4" aria-hidden="true" />
      </span>
    </Link>
  );
}
