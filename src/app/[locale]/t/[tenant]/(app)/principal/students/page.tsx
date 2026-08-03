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
 * enrollments as the authority + IAM batch name/dob/gender as decoration) —
 * but its RBAC is NOT the class list's, and a MANAGER-principal hits a 403.
 *
 * Ground truth (re-read 2026-08-03, edu-api
 * `services/core/.../usecase/list_students_in_class.go` `authorize()`):
 * `GET /classes/{id}/students` allows ONLY `isAdmin(...)` — i.e.
 * `SUPER_ADMIN`/`ADMIN`, per `usecase/shared.go` — or a TEACHER holding an
 * assignment to that class. There is NO `MANAGER` branch on THIS use case: the
 * US-164 MANAGER grant is scoped to `list_classes.go` alone, which says so in
 * its own comment ("admin-tier read access on THIS use case only ... not folded
 * into the shared isAdmin helper").
 *
 * Web's `principal` appRole maps from BOTH BE enums, so:
 * - an ADMIN-principal reads the roster normally;
 * - a MANAGER-principal gets a real 403 `roster_access_forbidden` on EVERY
 *   class roster read here — `toRosterFailure` turns it into `forbidden`, and
 *   the screen shows the non-retryable error card (no retry button), never an
 *   empty roster. Locked by `page.test.tsx` ("MANAGER-principal 403") +
 *   `principal-roster-screen.stories.tsx` `ForbiddenError`.
 * Every class fails the same way for that role, so `errorVm()` deliberately
 * drops the class picker too — offering a picker whose every option 403s would
 * be a dead control. Closing the gap is a BE ask (fe-lead's ask ledger), not
 * something this page may work around.
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
