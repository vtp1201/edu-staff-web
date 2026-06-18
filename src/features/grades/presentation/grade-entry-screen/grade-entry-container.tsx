"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GradeEntryScreen } from "./grade-entry-screen";
import type { GradeEntryScreenVM } from "./grade-entry-screen.i-vm";

/**
 * Client wrapper: drives class-subject / term selection through the URL
 * searchParams so the RSC page re-fetches the grade sheet. The screen itself
 * stays router-agnostic (stories pass no `onSelectionChange`).
 */
export function GradeEntryContainer({ vm }: { vm: GradeEntryScreenVM }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onSelectionChange(next: { csId?: string; term?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.csId !== undefined) params.set("csId", next.csId);
    if (next.term !== undefined) params.set("term", next.term);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return <GradeEntryScreen vm={vm} onSelectionChange={onSelectionChange} />;
}
