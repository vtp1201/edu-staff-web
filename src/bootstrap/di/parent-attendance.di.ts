import "server-only";

import { GetChildAttendanceUseCase } from "@/features/parent-attendance/domain/use-cases/get-child-attendance.use-case";
import { MockChildAttendanceRepository } from "@/features/parent-attendance/infrastructure/repositories/mocks/mock-child-attendance.repository";

/**
 * US-E20.5 — parent child-attendance: PERMANENTLY MOCK, and deliberately NOT
 * `USE_MOCK`-conditional.
 *
 * `GET /members/{memberId}/attendance` (`edu-api/services/core/docs/
 * openapi.yaml`, operationId `getMemberAttendance`) authorizes STUDENT (self)
 * or ADMIN/SUPER_ADMIN only — PARENT is absent from that list, so a real
 * branch here would 403 by design, not by accident, and flipping
 * `NEXT_PUBLIC_USE_MOCK=false` app-wide must NOT silently break this screen.
 * A cross-repo ask is filed with the BE team (add PARENT to the ACL, or ship a
 * parent-scoped `GET /parents/{id}/children/{childId}/attendance`).
 *
 * Un-mock later by constructing a real `ChildAttendanceRepository` here the
 * same way `grades.di.ts` wires `GradeBookRepository`; the DTO + mapper are
 * already contract-correct, so that diff is small. No unreachable "real"
 * repository class is written today (US-E18.20 lesson).
 *
 * Same unconditional-mock posture as `makeGetChildListUseCase` (ADR 0054).
 */
export async function makeGetChildAttendanceUseCase() {
  return new GetChildAttendanceUseCase(new MockChildAttendanceRepository());
}
