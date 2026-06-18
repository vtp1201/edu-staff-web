import { makeAdminSettingsRepository } from "@/bootstrap/di/admin-settings.di";
import { GradeApprovalContainer } from "@/features/grades/presentation/grade-approval-screen/grade-approval-container";
import type { GradeApprovalActions } from "@/features/grades/presentation/grade-approval-screen/grade-approval-screen.i-vm";
import {
  approveGradeBatchAction,
  bulkLockBatchesAction,
  getBatchDetailAction,
  listApprovalBatchesAction,
  requestGradeRevisionAction,
} from "./actions";

/**
 * Admin grade-approval pipeline (US-E14.4). RBAC is enforced by the
 * `/admin` layout role-guard; this RSC only resolves the operational
 * publish mode (REAL setting) and threads the Server Actions to the client.
 */
export default async function GradeApprovalPage() {
  const settingsRepo = await makeAdminSettingsRepository();
  const settings = await settingsRepo.getOperationalSettings();
  const isSelfPublishMode = settings.ok
    ? settings.data.gradePublishMode === "SELF_PUBLISH"
    : false;

  const actions: GradeApprovalActions = {
    listBatches: listApprovalBatchesAction,
    getDetail: getBatchDetailAction,
    approve: approveGradeBatchAction,
    requestRevision: requestGradeRevisionAction,
    bulkLock: bulkLockBatchesAction,
  };

  return (
    <GradeApprovalContainer
      actions={actions}
      isSelfPublishMode={isSelfPublishMode}
    />
  );
}
