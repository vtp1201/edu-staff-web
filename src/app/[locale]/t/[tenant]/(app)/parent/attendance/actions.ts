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
 * returns `ok: true` with `failedCount`, and the screen offers
 * {@link retryLeaveAttachmentsAction} against the SAME `requestId`.
 *
 * SECURITY (whose request is this?):
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

  const failedCount = await uploadAll(requestId, studentMemberId, files);
  return { ok: true, requestId, total: files.length, failedCount };
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
    return { ok: true, total: files.length, failedCount: files.length };

  const failedCount = await uploadAll(requestId, target, files);
  return { ok: true, total: files.length, failedCount };
}

/**
 * Upload SEQUENTIALLY (core counts attachments server-side and 409s on the 4th,
 * so concurrent uploads could race past the cap) and count the failures instead
 * of aborting: one rejected file must not strand the ones after it.
 */
async function uploadAll(
  requestId: string,
  studentMemberId: string,
  files: File[],
): Promise<number> {
  if (files.length === 0) return 0;
  const useCase = await makeUploadLeaveAttachmentUseCase();
  let failed = 0;
  for (const file of files) {
    try {
      await useCase.execute(requestId, studentMemberId, file);
    } catch {
      failed += 1;
    }
  }
  return failed;
}

/**
 * The student this mutation may address. `null` = refuse.
 *
 * Only the STUDENT branch is overridden. A PARENT (or any other role) keeps the
 * requested id because naming the child IS the request; core decides whether
 * the link exists.
 */
async function resolveTargetStudent(requested: string): Promise<string | null> {
  const token = (await getAccessToken()) ?? "";
  if (decodeRoleClaim(token) !== "student") return requested;
  // `decodeMemberIdClaim`, not `decodeMemberId`: `sub` is not proof of a
  // tenant-scoped session (decision 0074).
  return decodeMemberIdClaim(token);
}

/** Domain failures arrive as `{ type }`; anything else is a transport problem. */
function toErrorKey(err: unknown): DisciplineFailure["type"] {
  if (err && typeof err === "object" && "type" in err) {
    return (err as DisciplineFailure).type;
  }
  return "network-error";
}
