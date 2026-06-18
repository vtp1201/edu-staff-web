"use server";

import type { ExamBankFailure } from "@/features/exam-bank/domain/failures/exam-bank.failure";

// Admin exam-bank is read-only (AC-9). These server actions exist only to satisfy
// the ExamBankScreen VM contract; the UI never renders publish/delete affordances
// for admins (canPublish/canDelete are false), but the actions reject defensively.
export async function forbiddenAction(): Promise<{
  ok: false;
  errorKey: ExamBankFailure["type"];
}> {
  return { ok: false, errorKey: "forbidden" };
}
