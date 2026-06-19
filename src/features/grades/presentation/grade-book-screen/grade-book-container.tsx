"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GradeBookScreen } from "./grade-book-screen";
import type { GradeBookScreenVM } from "./grade-book-screen.i-vm";

/**
 * Client wrapper: drives class-subject / term selection through the URL
 * searchParams so the RSC page re-fetches the grade book. The screen itself
 * stays router-agnostic (stories pass no callbacks).
 */
export function GradeBookContainer({ vm }: { vm: GradeBookScreenVM }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onSelectionChange(next: { csId?: string; term?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.csId !== undefined) params.set("csId", next.csId);
    if (next.term !== undefined) params.set("term", next.term);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function onEnterGrades(csId: string) {
    if (!vm.gradeEntryPath) return;
    const params = new URLSearchParams();
    params.set("csId", csId);
    if (vm.selectedTerm) params.set("term", vm.selectedTerm);
    router.push(`${vm.gradeEntryPath}?${params.toString()}`);
  }

  return (
    <GradeBookScreen
      vm={vm}
      onSelectionChange={onSelectionChange}
      onEnterGrades={onEnterGrades}
      onRetry={() => router.refresh()}
    />
  );
}
