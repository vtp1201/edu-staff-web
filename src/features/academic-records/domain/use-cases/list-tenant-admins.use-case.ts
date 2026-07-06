import type { TenantAdminSummary } from "../entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../repositories/i-academic-records-seal.repository";

/** Query use-case: tenant admins — drives the self-approve fallback affordance
 * (ADR-0037, `adminCount === 1`) and the current-admin display-name lookup. */
export class ListTenantAdminsUseCase {
  constructor(private readonly repo: IAcademicRecordsSealRepository) {}

  execute(): Promise<SealResult<TenantAdminSummary[]>> {
    return this.repo.listTenantAdmins();
  }
}
