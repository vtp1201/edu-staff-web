import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeSubClaim } from "@/bootstrap/lib/jwt";
import { AcademicRecordSealContainer } from "@/features/academic-records/presentation/academic-record-seal-screen/academic-record-seal-container";
import type { AcademicRecordSealActions } from "@/features/academic-records/presentation/academic-record-seal-screen/academic-record-seal-screen.i-vm";
import {
  confirmUnsealAction,
  getAuditTrailAction,
  getPendingUnsealRequestsAction,
  getSealStatusAction,
  initiateUnsealAction,
  listAvailableClassesAction,
  listSealedStudentsAction,
  listTenantAdminsAction,
  sealAction,
} from "./actions";

/**
 * Admin Academic Record Seal (US-E14.6). RBAC is enforced by the `/admin`
 * layout role-guard; this RSC resolves the acting admin id from the httpOnly
 * access token and threads the Server Actions to the client container.
 */
export default async function AcademicRecordSealPage() {
  const token = await getAccessToken();
  const currentAdminId = (token ? decodeSubClaim(token) : null) ?? "";

  const actions: AcademicRecordSealActions = {
    listAvailableClasses: listAvailableClassesAction,
    getSealStatus: getSealStatusAction,
    seal: sealAction,
    getAuditTrail: getAuditTrailAction,
    listSealedStudents: listSealedStudentsAction,
    getPendingUnsealRequests: getPendingUnsealRequestsAction,
    initiateUnseal: initiateUnsealAction,
    confirmUnseal: confirmUnsealAction,
    listTenantAdmins: listTenantAdminsAction,
  };

  return (
    <AcademicRecordSealContainer
      actions={actions}
      currentAdminId={currentAdminId}
    />
  );
}
