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
 * BE authorization (re-ground-truthed 2026-08-05 against the edu-api working
 * copy, `services/core/internal/class/core/application/usecase/`). Web's
 * `principal` appRole collapses the BE enums `ADMIN` and `MANAGER`, and BOTH
 * reads this page makes now grant MANAGER admin-tier read explicitly:
 * - `list_classes.go` `authorize()` — `isAdmin(...) || hasRole(..., roleManager)`
 *   (US-164) → the class picker is a real call for this role.
 * - `list_students_in_class.go` `authorize()` — same condition since **US-175**
 *   (edu-api `011b82b2`, reported in `docs/reports/2026-08-04-be-to-fe-response.md`
 *   §"P1 — MANAGER RBAC"), which closes FE ask #46. Before US-175 this use case
 *   allowed only `isAdmin(...)` or an assigned TEACHER, so a MANAGER-principal
 *   was 403'd on every class roster read; that is no longer the case.
 *
 * So an ADMIN-principal and a MANAGER-principal both read the roster normally —
 * `getClassRoster` has been REAL for this screen since US-E18.35 (core
 * enrollments as the authority + IAM batch name/dob/gender as decoration) and
 * needs no hybrid/force-mock branch: `makeRosterRepository()` stays a plain
 * `USE_MOCK ? Mock : Real` gate. MANAGER remains deliberately OUT of the class
 * WRITE paths upstream (`roleManager` is not folded into `isAdmin`, pinned by a
 * BE negative test) — irrelevant here, since this page is read-only.
 *
 * `fetchError` is therefore a generic, role-agnostic failure path, not a
 * role-specific degrade: any real error from either read (403 for a caller that
 * genuinely lacks the grant, 404, transport) becomes a `RosterFailure` via
 * `toRosterFailure` and renders through `errorVm()`. `errorVm()` drops the class
 * picker on purpose — when the read that feeds every option failed there is no
 * trustworthy scope to offer. Error states are covered generically by
 * `page.test.tsx` and `principal-roster-screen.stories.tsx`
 * (`FetchError`/`ForbiddenError`).
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
