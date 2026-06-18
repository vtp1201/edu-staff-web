import { makeAdminSettingsRepository } from "@/bootstrap/di/admin-settings.di";
import { AdminSettingsScreen } from "@/features/admin-settings/presentation/admin-settings-screen/admin-settings-screen";
import { updateModeAction } from "./actions";

export default async function AdminSettingsPage() {
  const repo = await makeAdminSettingsRepository();
  const result = await repo.getOperationalSettings();
  const initialMode = result.ok ? result.data.gradePublishMode : null;

  return (
    <AdminSettingsScreen
      initialMode={initialMode}
      isReadOnly={false}
      onUpdateMode={updateModeAction}
    />
  );
}
