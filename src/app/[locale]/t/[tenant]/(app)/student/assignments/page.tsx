import { requireRole } from "@/bootstrap/auth-guard";
import { makeListAssignmentsUseCase } from "@/bootstrap/di/lms.di";
import type { AssignmentEntity } from "@/features/lms/domain/entities/assignment.entity";
import { StudentAssignmentsScreen } from "@/features/lms/presentation/student-assignments/student-assignments-screen";
import type { StudentAssignmentsScreenVm } from "@/features/lms/presentation/student-assignments/student-assignments-screen.i-vm";
import { listAssignmentsAction, submitAssignmentAction } from "./actions";

const MOCK_STUDENT_ID = "current-student";

export default async function StudentAssignmentsPage() {
  // RBAC (incl. reads) — story requirement, applied before the DI call.
  const guard = await requireRole(["student"]);
  if (!guard.ok) {
    const vm: StudentAssignmentsScreenVm = {
      assignments: [],
      pendingCount: 0,
      errorKey: "forbidden",
    };
    return (
      <StudentAssignmentsScreen
        {...vm}
        actions={{ listAssignmentsAction, submitAssignmentAction }}
      />
    );
  }

  let assignments: AssignmentEntity[] | null = null;
  let errorKey: StudentAssignmentsScreenVm["errorKey"] = null;
  const result = await (await makeListAssignmentsUseCase()).execute(
    MOCK_STUDENT_ID,
    "all",
  );
  if (result.ok) {
    assignments = result.data;
  } else if (result.failure.type === "forbidden") {
    errorKey = "forbidden";
  }
  // Other failures: leave `assignments` null → the client "all" region
  // cold-fetches and can retry (no wrong "empty" state).

  const pendingCount = (assignments ?? []).filter(
    (a) => a.status === "pending",
  ).length;

  const vm: StudentAssignmentsScreenVm = {
    assignments,
    pendingCount,
    errorKey,
  };
  return (
    <StudentAssignmentsScreen
      {...vm}
      actions={{ listAssignmentsAction, submitAssignmentAction }}
    />
  );
}
