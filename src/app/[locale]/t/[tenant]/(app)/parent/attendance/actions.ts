"use server";

import {
  makeSubmitMyLeaveRequestUseCase,
  makeUploadLeaveAttachmentUseCase,
} from "@/bootstrap/di/discipline.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeMemberIdClaim, decodeRoleClaim } from "@/bootstrap/lib/jwt";
import type { SubmitMyLeaveRequestInput } from "@/features/discipline/domain/entities/leave-request.entity";
import type { DisciplineFailure } from "@/features/discipline/domain/failures/discipline.failure";
import type {
  RetryLeaveAttachmentsResult,
  SubmitLeaveRequestResult,
} from "@/features/parent-attendance/presentation/parent-attendance-screen/submit-leave-request.types";

/**
 * Submit a leave request, then upload its evidence (US-E24.6).
 *
 * TWO STEPS, ONE ACTION, deliberately NOT one transaction: core has no
 * "create with attachments" route (one file per `POST .../attachments`), and a
 * failed FILE must not discard a request the GVCN can already act on. So the
 * request is created first and the files are uploaded after; a partial failure
 * returns `ok: true` with the NAMES of the files that failed, and the screen
 * offers {@link retryLeaveAttachmentsAction} for exactly those, against the
 * SAME `requestId`.
 *
 * SECURITY (whose request is this?) — an ALLOWLIST, see
 * {@link resolveTargetStudent}: only a student or a parent may file at all.
 * - A **STUDENT** caller may only address THEMSELVES. Whatever
 *   `input.studentMemberId` says is discarded and replaced by the token's own
 *   `memberId` claim (decision `0074`); a student with no such claim is refused
 *   before any HTTP. This is defence in depth on top of core's own check — the
 *   point is that a hand-made payload cannot even be SENT for a classmate.
 * - A **PARENT** caller legitimately names the linked child (there is no other
 *   way to say which child). core authorises the pair through
 *   `ParentStudentLinkReader`; an unlinked child comes back as
 *   `403 LEAVE_REQUEST_FORBIDDEN` → `errorKey: "forbidden"`.
 *
 * Returns STABLE FAILURE KEYS, never translated copy (`.claude/rules/i18n.md`).
 *
 * There is deliberately NO injectable clock parameter. A Server Action's
 * arguments all come from the client, so a `today` parameter would let a caller
 * hand the "start date must not be in the past" check any date it liked — an
 * injectable clock is a TEST convenience that must not become a public
 * argument. The tests freeze the system clock instead.
 */
export async function submitLeaveRequestAction(
  input: SubmitMyLeaveRequestInput,
  formData: FormData,
): Promise<SubmitLeaveRequestResult> {
  const studentMemberId = await resolveTargetStudent(input.studentMemberId);
  if (!studentMemberId) return { ok: false, errorKey: "forbidden" };

  const files = formData
    .getAll("file")
    .filter((entry): entry is File => entry instanceof File);

  let requestId: string;
  try {
    const useCase = await makeSubmitMyLeaveRequestUseCase();
    const created = await useCase.execute({ ...input, studentMemberId });
    requestId = created.id;
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }

  const failed = await uploadAll(requestId, studentMemberId, files);
  return {
    ok: true,
    requestId,
    total: files.length,
    failedFiles: failed.map((file) => file.name),
  };
}

/**
 * Re-upload files to an EXISTING request after a partial failure. It never
 * creates a second request — that is the whole reason it exists.
 *
 * `studentMemberId` gets the same STUDENT-caller override as
 * {@link submitLeaveRequestAction}: a retry is a mutation too.
 */
export async function retryLeaveAttachmentsAction(
  requestId: string,
  studentMemberId: string,
  formData: FormData,
): Promise<RetryLeaveAttachmentsResult> {
  const files = formData
    .getAll("file")
    .filter((entry): entry is File => entry instanceof File);
  const target = await resolveTargetStudent(studentMemberId);
  if (!target)
    return {
      ok: true,
      total: files.length,
      failedFiles: files.map((file) => file.name),
    };

  const failed = await uploadAll(requestId, target, files);
  return {
    ok: true,
    total: files.length,
    failedFiles: failed.map((file) => file.name),
  };
}

/**
 * Upload SEQUENTIALLY (core counts attachments server-side and 409s on the 4th,
 * so concurrent uploads could race past the cap) and COLLECT the files that
 * failed instead of aborting: one rejected file must not strand the ones after
 * it.
 *
 * It returns the failed FILES, not a count, because the caller has to be able
 * to re-send exactly those. A count would force the screen to re-send the whole
 * original list, which — against a request that already holds the successful
 * ones — walks straight into core's 3-attachment cap.
 */
async function uploadAll(
  requestId: string,
  studentMemberId: string,
  files: File[],
): Promise<File[]> {
  if (files.length === 0) return [];
  const useCase = await makeUploadLeaveAttachmentUseCase();
  const failed: File[] = [];
  for (const file of files) {
    try {
      await useCase.execute(requestId, studentMemberId, file);
    } catch {
      failed.push(file);
    }
  }
  return failed;
}

/**
 * The student this mutation may address. `null` = refuse before any HTTP.
 *
 * An ALLOWLIST, deliberately: only the two roles that legitimately file a leave
 * request are enumerated, and everything else — teacher, principal, admin, a
 * token whose role claim is unreadable — is refused. The previous shape was a
 * denylist (override the STUDENT, pass everyone else through) which fails OPEN:
 * any non-student token could name any student id it liked, and this is a
 * no-undo mutation (tech-lead review, fix round).
 */
async function resolveTargetStudent(requested: string): Promise<string | null> {
  const token = (await getAccessToken()) ?? "";
  const role = decodeRoleClaim(token);
  // A student may only ever address THEMSELVES, and `decodeMemberIdClaim` (not
  // `decodeMemberId`): `sub` is not proof of a tenant-scoped session
  // (decision 0074).
  if (role === "student") return decodeMemberIdClaim(token);
  // A parent legitimately names the linked child — there is no other way to say
  // WHICH child; core authorises the pair through `ParentStudentLinkReader`.
  if (role === "parent") return requested;
  return null;
}

/** Domain failures arrive as `{ type }`; anything else is a transport problem. */
function toErrorKey(err: unknown): DisciplineFailure["type"] {
  if (err && typeof err === "object" && "type" in err) {
    return (err as DisciplineFailure).type;
  }
  return "network-error";
}
