import { makeListYearsUseCase } from "@/bootstrap/di/calendar.di";
import { CalendarScreen } from "@/features/admin/calendar/presentation/calendar-screen/calendar-screen";
import {
  createTermAction,
  createYearAction,
  deleteTermAction,
  updateTermAction,
} from "./actions";

export default async function CalendarPage() {
  const years = await (await makeListYearsUseCase()).execute();

  return (
    <CalendarScreen
      initialData={{ years }}
      actions={{
        createYearAction,
        createTermAction,
        updateTermAction,
        deleteTermAction,
      }}
    />
  );
}
