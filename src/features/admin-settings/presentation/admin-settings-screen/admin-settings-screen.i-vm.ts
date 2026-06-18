import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";

export interface AdminSettingsScreenVm {
  currentMode: GradePublishMode | null;
  loading: boolean;
  errorKey: string | null;
  isReadOnly: boolean;
}
