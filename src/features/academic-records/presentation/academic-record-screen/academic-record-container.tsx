"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { academicRecordHref } from "@/features/parent/presentation/children-overview-screen/build-children-overview-vm";
import { AcademicRecordScreen } from "./academic-record-screen";
import type { AcademicRecordScreenVM } from "./academic-record-screen.i-vm";

/**
 * Client wrapper: drives year selection through the URL searchParams so the RSC
 * page re-fetches the (year-narrowed) record. The screen stays router-agnostic
 * (stories pass no callbacks).
 *
 * `basePath` is the tenant-scoped `/t/{tenant}/parent/children` prefix, supplied
 * only by the PARENT route (the client has no access to the tenant segment).
 * Its absence is what makes child switching a parent-only affordance: the other
 * three role routes pass no base path, so `onSwitchChild` is `undefined` there
 * and the selector — which their VMs never carry anyway — could not navigate
 * even if it somehow rendered.
 */
export function AcademicRecordContainer({
  vm,
  basePath,
}: {
  vm: AcademicRecordScreenVM;
  basePath?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSwitchingChild, startTransition] = useTransition();

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
      isSwitchingChild={isSwitchingChild}
      onSwitchChild={
        basePath
          ? (childId) =>
              // `push`, not `replace`: switching child is a real navigation the
              // parent should be able to walk back out of. The current child's
              // `?year` is deliberately DROPPED — school years differ between
              // children, and carrying a year the target child never attended
              // would land them on an empty tab; the RSC resolves that child's
              // own current year instead.
              startTransition(() =>
                router.push(academicRecordHref(basePath, childId)),
              )
          : undefined
      }
    />
  );
}
