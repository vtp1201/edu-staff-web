import type { LeaveRequestEntity } from "../entities/leave-request.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

/**
 * Read ONE student's leave requests so the attendance history can name the
 * reason behind each excused day and surface still-pending requests (US-E24.6).
 *
 * Deliberately NOT `GetMyLeaveRequestsUseCase`: that one serves
 * `/student/conduct` over the force-mocked repository, and a shared use-case
 * would make the two paths one edit away from swapping.
 */
export class GetLeaveRequestsForAttendanceUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(studentMemberId: string): Promise<LeaveRequestEntity[]> {
    return this.repo.getLeaveRequestsForAttendance(studentMemberId);
  }
}
