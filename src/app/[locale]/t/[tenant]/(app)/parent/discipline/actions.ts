"use server";

import {
  makeGetChildConductSummaryUseCase,
  makeGetChildLeaveRequestsUseCase,
  makeGetChildViolationsUseCase,
  makeSubmitChildLeaveRequestUseCase,
} from "@/bootstrap/di/discipline.di";
import type { SubmitChildLeaveRequestInput } from "@/features/discipline/domain/entities/leave-request.entity";
import type { DisciplineFailure } from "@/features/discipline/domain/failures/discipline.failure";
import type {
  ChildConductResult,
  ChildLeaveResult,
  ChildViolationsResult,
} from "@/features/discipline/presentation/parent-discipline/parent-discipline-screen.i-vm";

function toErrorKey(err: unknown): DisciplineFailure["type"] {
  if (err && typeof err === "object" && "type" in err) {
    return (err as DisciplineFailure).type;
  }
  return "network-error";
}

/** INT-005: the only write — submit a leave request on behalf of a child. */
export async function submitChildLeaveRequestAction(
  childId: string,
  input: SubmitChildLeaveRequestInput,
): Promise<{ errorKey?: DisciplineFailure["type"] }> {
  try {
    await (await makeSubmitChildLeaveRequestUseCase()).execute(childId, input);
    return {};
  } catch (err) {
    return { errorKey: toErrorKey(err) };
  }
}

export async function getChildConductAction(
  childId: string,
): Promise<ChildConductResult> {
  try {
    const data = await (await makeGetChildConductSummaryUseCase()).execute(
      childId,
    );
    return { data };
  } catch (err) {
    return { errorKey: toErrorKey(err) };
  }
}

export async function getChildViolationsAction(
  childId: string,
): Promise<ChildViolationsResult> {
  try {
    const data = await (await makeGetChildViolationsUseCase()).execute(childId);
    return { data };
  } catch (err) {
    return { errorKey: toErrorKey(err) };
  }
}

export async function getChildLeaveRequestsAction(
  childId: string,
): Promise<ChildLeaveResult> {
  try {
    const data = await (await makeGetChildLeaveRequestsUseCase()).execute(
      childId,
    );
    return { data };
  } catch (err) {
    return { errorKey: toErrorKey(err) };
  }
}
