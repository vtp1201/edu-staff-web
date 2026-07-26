"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface ViewTeachersCtaProps {
  label: string;
  /** `(app)/principal/teachers` route, built by the RSC page (tenant-scoped). */
  href: string;
}

/**
 * UC-2 link-out to the teachers/homeroom screen (FR-010). Mounted by the screen
 * ONLY in the success branch (AC-2.1); navigation only — no inline assignment
 * UI ever opens here (AC-2.2, FR-009).
 */
export function ViewTeachersCta({ label, href }: ViewTeachersCtaProps) {
  return (
    <Button asChild variant="outline">
      <Link href={href}>{label}</Link>
    </Button>
  );
}
