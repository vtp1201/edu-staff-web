import { Suspense } from "react";
import { makeRosterRepository } from "@/bootstrap/di/admin-roster.di";
import { PrincipalRosterScreen } from "@/features/admin-roster/presentation/principal-roster-screen/principal-roster-screen";
import type { PrincipalRosterScreenVm } from "@/features/admin-roster/presentation/principal-roster-screen/principal-roster-screen.i-vm";
import { PrincipalRosterSkeleton } from "@/features/admin-roster/presentation/principal-roster-screen/principal-roster-skeleton";

/**
 * Read-only, per-class student roster for the `principal` role (US-E13.10) —
 * closes the previously-404 `/principal/students` sidebar link.
 *
 * Same page composition as the sibling `(app)/admin/roster/page.tsx`
 * (`getClasses()` → `?classId=` or first class → `getClassRoster()`), reusing
 * `makeRosterRepository()` UNCHANGED. There is deliberately no `actions.ts`
 * next to this page and no enroll/unenroll/transfer import anywhere in this
 * file — the absence of any mutation code path IS the read-only proof.
 *
 * RBAC comes entirely from the existing `(app)/principal/layout.tsx` guard.
 *
 * BE authorization (ground-truthed 2026-08-02 in edu-api
 * `services/core/internal/class/core/application/usecase/list_classes.go`):
 * `GET /api/v1/classes` explicitly grants `MANAGER` admin-tier read alongside
 * ADMIN/SUPER_ADMIN (US-164), and web's `principal` appRole collapses both BE
 * enums — so the class picker is a real call for this role, no 403, no hybrid
 * branch needed.
 *
 * `getClassRoster` is REAL for this screen too since US-E18.35 (core
 * enrollments as the authority + IAM batch name/dob/gender as decoration).
 * Core's `ListStudentsInClassUseCase` grants the same admin tier the class list
 * does, and IAM's batch lookup treats MANAGER as staff tier — so a principal
 * sees the same real rows an admin does, just with no mutation affordance.
 */
async function PrincipalRosterContent({ classId }: { classId?: string }) {
  const repo = await makeRosterRepository();
  const classesResult = await repo.getClasses({});

  if (!classesResult.ok) {
    return <PrincipalRosterScreen vm={errorVm(classesResult.error.type)} />;
  }

  const classes = classesResult.data;
  if (classes.length === 0) {
    return (
      <PrincipalRosterScreen
        vm={{
          classes,
          currentClass: null,
          roster: [],
          activeCount: 0,
          transferredCount: 0,
          fetchError: null,
        }}
      />
    );
  }

  const currentClass = classes.find((c) => c.id === classId) ?? classes[0];
  const rosterResult = await repo.getClassRoster(currentClass.id);

  if (!rosterResult.ok) {
    return <PrincipalRosterScreen vm={errorVm(rosterResult.error.type)} />;
  }

  const roster = rosterResult.data;
  const vm: PrincipalRosterScreenVm = {
    classes,
    currentClass,
    roster,
    activeCount: roster.filter((s) => s.status === "active").length,
    transferredCount: roster.filter((s) => s.status === "transferred").length,
    fetchError: null,
  };

  return <PrincipalRosterScreen key={currentClass.id} vm={vm} />;
}

function errorVm(
  fetchError: PrincipalRosterScreenVm["fetchError"],
): PrincipalRosterScreenVm {
  return {
    classes: [],
    currentClass: null,
    roster: [],
    activeCount: 0,
    transferredCount: 0,
    fetchError,
  };
}

export default async function PrincipalStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId } = await searchParams;
  return (
    <Suspense fallback={<PrincipalRosterSkeleton />}>
      <PrincipalRosterContent classId={classId} />
    </Suspense>
  );
}
