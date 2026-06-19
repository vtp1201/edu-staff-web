"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AcademicRecordScreen } from "./academic-record-screen";
import type { AcademicRecordScreenVM } from "./academic-record-screen.i-vm";

/**
 * Client wrapper: drives year selection through the URL searchParams so the RSC
 * page re-fetches the (year-narrowed) record. The screen stays router-agnostic
 * (stories pass no callbacks).
 */
export function AcademicRecordContainer({
  vm,
}: {
  vm: AcademicRecordScreenVM;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onYearChange(yearId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", yearId);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <AcademicRecordScreen
      vm={vm}
      onYearChange={onYearChange}
      onRetry={() => router.refresh()}
    />
  );
}
