import type { LeaveAttachmentEntity } from "../entities/leave-request.entity";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

/**
 * Upload ONE piece of evidence to an existing leave request (core US-249,
 * US-E24.6). The caller loops over the files — core accepts one per call and
 * counts them server-side.
 *
 * No file-shape validation here: the client-side check
 * (`validateLeaveAttachments`) is UX and core's sniffing check is the real
 * boundary. Re-implementing a third, weaker copy in the domain would only
 * invite the three to drift.
 */
export class UploadLeaveAttachmentUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(
    requestId: string,
    studentMemberId: string,
    file: File,
  ): Promise<LeaveAttachmentEntity> {
    if (requestId.trim() === "" || studentMemberId.trim() === "") {
      const failure: DisciplineFailure = { type: "not-found" };
      throw failure;
    }
    return this.repo.uploadLeaveAttachment(requestId, studentMemberId, file);
  }
}
