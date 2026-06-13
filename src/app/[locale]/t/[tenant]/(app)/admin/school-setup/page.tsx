import { makeSchoolConfigRepository } from "@/bootstrap/di/admin-school-setup.di";
import { SchoolSetupScreen } from "@/features/admin-school-setup/presentation/school-setup-screen/school-setup-screen";
import {
  saveGradeLevelRangeAction,
  saveOperationalSettingsAction,
} from "./actions";

export default async function SchoolSetupPage() {
  const repo = await makeSchoolConfigRepository();
  const [configResult, statusResult] = await Promise.all([
    repo.getConfig(),
    repo.getSetupStatus(),
  ]);

  const initialConfig = configResult.ok ? configResult.data : null;
  const initialSetupStatus = statusResult.ok ? statusResult.data : null;

  return (
    <SchoolSetupScreen
      initialConfig={initialConfig}
      initialSetupStatus={initialSetupStatus}
      onSaveGradeRange={saveGradeLevelRangeAction}
      onSaveMode={saveOperationalSettingsAction}
    />
  );
}
