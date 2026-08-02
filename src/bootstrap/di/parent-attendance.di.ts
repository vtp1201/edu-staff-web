import "server-only";

import { USE_MOCK } from "@/bootstrap/lib/mock";
import { GetChildAttendanceUseCase } from "@/features/parent-attendance/domain/use-cases/get-child-attendance.use-case";
import { MockChildAttendanceRepository } from "@/features/parent-attendance/infrastructure/repositories/mocks/mock-child-attendance.repository";
import { UnavailableChildAttendanceRepository } from "@/features/parent-attendance/infrastructure/repositories/unavailable-child-attendance.repository";

/**
 * US-E20.5 — parent child-attendance.
 *
 * `GET /members/{memberId}/attendance` (`edu-api/services/core/docs/
 * openapi.yaml`, operationId `getMemberAttendance`) authorizes STUDENT (self)
 * or ADMIN/SUPER_ADMIN only — PARENT is absent from that list, so there is no
 * real call to make today. A cross-repo ask is filed with the BE team (add
 * PARENT to the ACL, or ship a parent-scoped
 * `GET /parents/{id}/children/{childId}/attendance`).
 *
 * This is deliberately NOT the force-mock posture of
 * `makePrincipalClassesRepository()` (US-E13.8) / `makeGetChildListUseCase`
 * (ADR 0054): those serve harmless roster-shaped seed data, whereas fabricating
 * present/late/excused/absent rows for a parent's REAL child is data a parent
 * could act on. So the mock is gated behind `NEXT_PUBLIC_USE_MOCK` and a real
 * environment gets `UnavailableChildAttendanceRepository`, which rejects a typed
 * `forbidden` WITHOUT attempting HTTP — the screen then renders the honest
 * "not available yet" alert with no retry control (`isRetryableFailure`).
 *
 * Un-mock later by swapping `UnavailableChildAttendanceRepository` for a real
 * HTTP repository here (same way `grades.di.ts` wires `GradeBookRepository`);
 * the DTO + mapper are already contract-correct, so that diff is small.
 */
export async function makeGetChildAttendanceUseCase() {
  return new GetChildAttendanceUseCase(
    USE_MOCK
      ? new MockChildAttendanceRepository()
      : new UnavailableChildAttendanceRepository(),
  );
}
