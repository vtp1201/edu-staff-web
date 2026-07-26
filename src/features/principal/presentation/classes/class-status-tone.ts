import type { StatusTone } from "@/components/shared/status-badge";
import type { ClassStatus } from "@/features/admin/class-management/domain/entities/class.entity";

/**
 * `Class.status` → badge tone. Single source for BOTH `ClassesTable` and
 * `ClassesCardList` (no inline duplication, component-organization.md).
 * Matches the admin sibling rendering of this exact entity field
 * (`class-management-screen.tsx`: ACTIVE → success, ARCHIVED → muted), so the
 * two `Class` lists stay visually consistent app-wide.
 */
export const CLASS_STATUS_TONE: Record<ClassStatus, StatusTone> = {
  ACTIVE: "success",
  ARCHIVED: "muted",
};
