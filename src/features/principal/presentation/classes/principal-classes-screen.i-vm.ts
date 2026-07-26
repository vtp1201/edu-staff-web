import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import type { ClassManagementFailure } from "@/features/admin/class-management/domain/failures/class-management.failure";

/**
 * RSC↔client contract for `(app)/principal/classes` (US-E13.8).
 * `ClassListPage`/`LoadMoreResult` are declared here (not in the Server Action)
 * so the action and the screen share exactly one shape.
 */
export interface ClassListPage {
  data: Class[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Discriminated on `ok`, so the screen can't read `data` off a failure (or an
 * `errorKey` off a success) — no defensive `?? "unknown"` fallbacks needed.
 * The failure carries a stable key; presentation translates it, the Server
 * Action never does.
 */
export type LoadMoreResult =
  | { ok: true; data: ClassListPage }
  | { ok: false; errorKey: ClassManagementFailure["type"] };

export interface PrincipalClassesVm {
  classes: Class[];
  nextCursor: string | null;
  hasMore: boolean;
  academicYear: string;
  /** Set only when the INITIAL RSC-side fetch failed; null on success. */
  fetchError: ClassManagementFailure["type"] | null;
  /** Route to `(app)/principal/teachers` for the UC-2 CTA (FR-010). */
  teachersHref?: string;
}

export interface PrincipalClassesScreenProps {
  vm: PrincipalClassesVm;
  /** Server Action ref (`loadMoreClassesAction`). */
  onLoadMore: (academicYear: string, cursor: string) => Promise<LoadMoreResult>;
  /** Storybook-only: render the initial loading skeleton. */
  loading?: boolean;
}
