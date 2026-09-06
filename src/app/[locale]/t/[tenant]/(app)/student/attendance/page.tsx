import { makeListYearsUseCase } from "@/bootstrap/di/calendar.di";
import { makeGetLeaveRequestsForAttendanceUseCase } from "@/bootstrap/di/discipline.di";
import { makeGetChildAttendanceUseCase } from "@/bootstrap/di/parent-attendance.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeMemberIdClaim } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { AbsenceHistoryRow } from "@/features/attendance/domain/entities/absence-history-row.entity";
import { joinAbsenceReasons } from "@/features/attendance/domain/join-absence-reasons";
import { summarizeAttendance } from "@/features/attendance/domain/summarize-attendance";
import {
  fallbackRange,
  termRangeFor,
} from "@/features/attendance/presentation/student-attendance-screen/resolve-student-range";
import { StudentAttendanceContainer } from "@/features/attendance/presentation/student-attendance-screen/student-attendance-container";
import type { StudentAttendanceScreenVM } from "@/features/attendance/presentation/student-attendance-screen/student-attendance-screen.i-vm";
import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";
import type { AttendanceDateRange } from "@/features/parent-attendance/domain/entities/attendance-date-range.entity";

/**
 * Seed identity for `NEXT_PUBLIC_USE_MOCK=true` only. A local dev token carries
 * no `memberId` claim, so without this the whole screen would render the
 * `forbidden` state in mock mode and be undevelopable. It is NEVER consulted in
 * a real environment — the same posture `resolveMyClassId()` documents.
 */
const MOCK_STUDENT_MEMBER_ID = "mock-student-1";

/**
 * `/student/attendance` — "Chuyên cần của tôi" (US-E24.6).
 *
 * SECURITY: the student is identified ONLY by the server-decoded `memberId`
 * claim (decision `0074`) — never a search param, never a prop. No claim means
 * no read at all: the page returns the `forbidden` VM without touching the wire
 * (proved in `page.test.ts`). `sub` is deliberately NOT a fallback: only the
 * `memberId` claim proves the token is tenant-scoped.
 *
 * No manual role check is needed — `student/layout.tsx` already enforces
 * `role === "student"`.
 *
 * The attendance read is the SAME real endpoint the parent screen uses
 * (`GET /core/api/v1/members/{memberId}/attendance`, US-E18.34) — a student
 * reading THEMSELVES is core's own `actor === target` branch. The leave-request
 * read is real as of US-E24.6 and is NON-BLOCKING: it only annotates the
 * history, so a failure costs the reasons, never the whole screen.
 */
export default async function StudentAttendancePage() {
  const memberId = await resolveMyMemberId();
  if (!memberId) {
    return <StudentAttendanceContainer vm={{ status: "forbidden" }} />;
  }

  const today = new Date().toISOString().slice(0, 10);
  const range = (await resolveTermRange(today)) ?? fallbackRange(today);

  const [attendance, leaveRequests] = await Promise.allSettled([
    (await makeGetChildAttendanceUseCase()).execute(memberId, range),
    (await makeGetLeaveRequestsForAttendanceUseCase()).execute(memberId),
  ]);

  if (attendance.status === "rejected") {
    return (
      <StudentAttendanceContainer
        vm={{ status: "error", range, errorKey: "unknown" }}
      />
    );
  }
  if (!attendance.value.ok) {
    return (
      <StudentAttendanceContainer
        vm={{ status: "error", range, errorKey: attendance.value.error.type }}
      />
    );
  }

  const requests: LeaveRequestEntity[] =
    leaveRequests.status === "fulfilled" ? leaveRequests.value : [];

  const { summary, months } = summarizeAttendance(attendance.value.data);
  const history: AbsenceHistoryRow[] = joinAbsenceReasons(
    attendance.value.data,
    requests,
  );

  const vm: StudentAttendanceScreenVM = {
    status: "ready",
    range,
    summary,
    months,
    history,
  };
  return <StudentAttendanceContainer vm={vm} />;
}

/** The signed-in student's own member id — claim only (see the page doc). */
async function resolveMyMemberId(): Promise<string | null> {
  if (USE_MOCK) return MOCK_STUDENT_MEMBER_ID;
  const token = await getAccessToken();
  return token ? decodeMemberIdClaim(token) : null;
}

/**
 * The current term of the active academic year, or `null`.
 *
 * `GET /academic-years` is an admin-shaped read and a STUDENT may well be
 * refused it (packet Q1). Any failure — 403, network, an unreadable payload —
 * degrades to `null` and the caller uses the six-month fallback, which needs no
 * server at all. The applied range is rendered in the subtitle either way, so
 * the fallback is visible, not silent.
 */
async function resolveTermRange(
  today: string,
): Promise<AttendanceDateRange | null> {
  try {
    const years = await (await makeListYearsUseCase()).execute();
    return termRangeFor(years, today);
  } catch {
    return null;
  }
}
