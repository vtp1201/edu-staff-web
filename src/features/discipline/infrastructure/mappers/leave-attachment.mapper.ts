import type { LeaveAttachmentEntity } from "../../domain/entities/leave-request.entity";
import type { LeaveRequestAttachmentResponseDto } from "../dtos/leave-request-attachment-response.dto";

/**
 * `LeaveRequestAttachmentResponse` → `LeaveAttachmentEntity` (US-E24.6).
 *
 * `expiresAt` is deliberately NOT carried into the entity: the URL is presigned
 * for ~15 minutes and the UI links to it immediately, so an expiry the screen
 * cannot act on would be a field that only invites a wrong "expired" badge.
 * `unavailable` IS carried — it changes what the UI must render.
 */
export function toLeaveAttachmentEntity(
  dto: LeaveRequestAttachmentResponseDto,
): LeaveAttachmentEntity {
  return {
    id: dto.attachmentId,
    fileName: dto.fileName,
    contentType: dto.contentType,
    sizeBytes: dto.sizeBytes,
    url: dto.url,
    uploadedAt: dto.uploadedAt,
    unavailable: dto.unavailable,
  };
}
