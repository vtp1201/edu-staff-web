import { getTranslations } from "next-intl/server";
import { makeListEntriesUseCase } from "@/bootstrap/di/class-log.di";
import { makeListMyTeacherClassesUseCase } from "@/bootstrap/di/teacher-class.di";
import type { HomeroomEntry } from "@/features/class-log/domain/entities/homeroom-entry.entity";
import type { HomeroomEntryStatus } from "@/features/class-log/domain/entities/homeroom-entry-status.entity";
import { ClassLogScreen } from "@/features/class-log/presentation/class-log-screen/class-log-screen";
import type { TeacherClass } from "@/features/teacher/domain/entities/teacher-class.entity";
import {
  approveEntryAction,
  createEntryAction,
  rejectEntryAction,
  reviseEntryAction,
  submitEntryAction,
} from "./actions";

type SearchParams = Promise<{ classId?: string; status?: string }>;

/** The teacher's classes — the switcher's options, and the `classId → name`
 *  lookup for the header (it used to print the raw uuid). */
async function myClasses(): Promise<TeacherClass[]> {
  const result = await (await makeListMyTeacherClassesUseCase()).execute();
  return result.ok ? result.data : [];
}

export default async function TeacherClassLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const filterStatus = sp.status as HomeroomEntryStatus | undefined;
  const classes = await myClasses();
  // Auto-select the first class: the old "pick a class" screen was a dead click
  // for a teacher with one class. Switching now lives in the screen's own header
  // (`ClassLogClassPicker`); the URL param still wins.
  const classId = sp.classId ?? classes[0]?.id;

  if (!classId) {
    const t = await getTranslations("classLog");
    return (
      <div
        role="status"
        className="m-8 rounded-[var(--edu-radius-card)] border border-border border-dashed bg-card px-6 py-16 text-center text-muted-foreground text-sm"
      >
        {t("detail.noClasses")}
      </div>
    );
  }

  let entries: HomeroomEntry[] = [];
  try {
    const result = await (await makeListEntriesUseCase()).execute({ classId });
    entries = result.entries;
  } catch {
    entries = [];
  }

  return (
    <ClassLogScreen
      classId={classId}
      className={classes.find((c) => c.id === classId)?.name ?? classId}
      classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      entries={entries}
      hasMore={false}
      isPrincipal={false}
      filterStatus={filterStatus}
      createEntryAction={createEntryAction}
      submitEntryAction={submitEntryAction}
      reviseEntryAction={reviseEntryAction}
      approveEntryAction={approveEntryAction}
      rejectEntryAction={rejectEntryAction}
    />
  );
}
