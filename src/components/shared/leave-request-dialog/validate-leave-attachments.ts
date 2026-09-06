/**
 * Client-side shape check for leave-request evidence (US-E24.6, core US-249).
 *
 * NOT A SECURITY BOUNDARY — it is UX only. Core re-validates every file and
 * SNIFFS the media type (`422 LEAVE_REQUEST_ATTACHMENT_INVALID_FILE`); a
 * renamed `.exe` passes this function and is refused there. The point of doing
 * it here is to fail fast and readably instead of after a 5MB upload.
 *
 * Pure and framework-free so it is provable in the repo's node-env Vitest; the
 * dialog wiring is proven in `leave-request-dialog.stories.tsx`.
 */

/** core: at most 3 attachments per request (`409 …_LIMIT_EXCEEDED` on a 4th). */
export const MAX_ATTACHMENTS = 3;

/** core: 5MB per file (`sizeBytes` maximum 5242880). */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/**
 * Extensions matching core's sniffed allow-list (image/jpeg, image/png,
 * application/pdf). The EXTENSION is checked rather than `file.type` because a
 * browser reports an empty/duplicate type for plenty of legitimate files, and
 * the declared type is not trusted server-side anyway.
 */
export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "pdf",
] as const;

/** Why one file was refused. Each maps to its own i18n message — a single
 *  "file không hợp lệ" would leave the user guessing which rule they broke. */
export type AttachmentRejectionReason = "ext" | "size" | "count";

export interface RejectedAttachment {
  file: File;
  reason: AttachmentRejectionReason;
}

export interface LeaveAttachmentValidation {
  valid: File[];
  rejected: RejectedAttachment[];
}

/**
 * @param files the newly picked files, in selection order.
 * @param alreadyAccepted how many files the dialog is already holding. The
 *   picker appends, so the cap must count them — otherwise "add one more"
 *   three times sends six files and core 409s on the fourth.
 */
export function validateLeaveAttachments(
  files: readonly File[],
  alreadyAccepted = 0,
): LeaveAttachmentValidation {
  const valid: File[] = [];
  const rejected: RejectedAttachment[] = [];

  for (const file of files) {
    // Order matters: a `.gif` is reported as a wrong TYPE even when it is also
    // oversized — that is the more explanatory of the two, and re-compressing
    // a gif would not help.
    if (!hasAllowedExtension(file.name)) {
      rejected.push({ file, reason: "ext" });
      continue;
    }
    if (file.size <= 0 || file.size > MAX_ATTACHMENT_BYTES) {
      rejected.push({ file, reason: "size" });
      continue;
    }
    // A rejected file never consumes a slot.
    if (alreadyAccepted + valid.length >= MAX_ATTACHMENTS) {
      rejected.push({ file, reason: "count" });
      continue;
    }
    valid.push(file);
  }

  return { valid, rejected };
}

function hasAllowedExtension(fileName: string): boolean {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0 || dot === fileName.length - 1) return false;
  const ext = fileName.slice(dot + 1).toLowerCase();
  return (ALLOWED_ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext);
}
