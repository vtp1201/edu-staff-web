import { requireRole } from "@/bootstrap/auth-guard";
import { makeListAssignmentsUseCase } from "@/bootstrap/di/lms.di";
import { resolveMyClassId } from "@/bootstrap/lib/resolve-my-class";
import type { AssignmentSummary } from "@/features/lms/domain/entities/assignment.entity";
import { StudentAssignmentsScreen } from "@/features/lms/presentation/student-assignments/student-assignments-screen";
import type { StudentAssignmentsScreenVm } from "@/features/lms/presentation/student-assignments/student-assignments-screen.i-vm";
import {
  getAssignmentDetailAction,
  listAssignmentsAction,
  submitAssignmentAction,
} from "./actions";

const ACTIONS = {
  listAssignmentsAction,
  getAssignmentDetailAction,
  submitAssignmentAction,
};

/**
 * `/student/assignments` — the assignments of the student's own class.
 *
 * Same class-scoping story as `/student/courses`: `GET /assignments?classId=`
 * requires the class, which core's enrollment read resolves.
 */
export default async function StudentAssignmentsPage() {
  const guard = await requireRole(["student"]);
  if (!guard.ok) {
    const vm: StudentAssignmentsScreenVm = {
      assignments: [],
      errorKey: "forbidden",
    };
    return <StudentAssignmentsScreen {...vm} actions={ACTIONS} />;
  }

  const classId = await resolveMyClassId();
  if (classId === null) {
    const vm: StudentAssignmentsScreenVm = {
      assignments: [],
      errorKey: "no-class",
    };
    return <StudentAssignmentsScreen {...vm} actions={ACTIONS} />;
  }

  let assignments: AssignmentSummary[] | null = null;
  let errorKey: StudentAssignmentsScreenVm["errorKey"] = null;

  const result = await (await makeListAssignmentsUseCase()).execute(classId);
  if (result.ok) {
    assignments = result.data;
  } else if (result.failure.type === "forbidden") {
    errorKey = "forbidden";
  }
  // Other failures: leave `assignments` null → the client region cold-fetches
  // and can retry (never a wrong "empty" state).

  return (
    <StudentAssignmentsScreen
      assignments={assignments}
      errorKey={errorKey}
      actions={ACTIONS}
    />
  );
}
