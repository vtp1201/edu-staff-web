"use server";

import { revalidatePath } from "next/cache";
import { makeSubmitLeaveRequestUseCase } from "@/bootstrap/di/discipline.di";
import type { SubmitLeaveRequestInput } from "@/features/discipline/domain/entities/leave-request.entity";
import type { DisciplineFailure } from "@/features/discipline/domain/failures/discipline.failure";

const STUDENT_PATH = "/[locale]/t/[tenant]/(app)/student/conduct";

function toErrorKey(err: unknown): DisciplineFailure["type"] {
  if (err && typeof err === "object" && "type" in err) {
    return (err as DisciplineFailure).type;
  }
  return "network-error";
}

export async function submitLeaveRequestAction(
  input: SubmitLeaveRequestInput,
): Promise<{ errorKey?: DisciplineFailure["type"] }> {
  try {
    await (await makeSubmitLeaveRequestUseCase()).execute(input);
    revalidatePath(STUDENT_PATH, "page");
    return {};
  } catch (err) {
    return { errorKey: toErrorKey(err) };
  }
}
