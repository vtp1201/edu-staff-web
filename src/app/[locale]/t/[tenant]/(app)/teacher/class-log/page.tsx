import { getTranslations } from "next-intl/server";
import { makeListEntriesUseCase } from "@/bootstrap/di/class-log.di";
import type { HomeroomEntry } from "@/features/class-log/domain/entities/homeroom-entry.entity";
import type { HomeroomEntryStatus } from "@/features/class-log/domain/entities/homeroom-entry-status.entity";
import { ClassLogScreen } from "@/features/class-log/presentation/class-log-screen/class-log-screen";
import {
  approveEntryAction,
  createEntryAction,
  rejectEntryAction,
  submitEntryAction,
} from "./actions";

type SearchParams = Promise<{ classId?: string; status?: string }>;

export default async function TeacherClassLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const classId = sp.classId;
  const filterStatus = sp.status as HomeroomEntryStatus | undefined;

  if (!classId) {
    const t = await getTranslations("classLog");
    return (
      <div
        role="status"
        className="m-8 rounded-[var(--edu-radius-card)] border border-border border-dashed bg-card px-6 py-16 text-center text-muted-foreground text-sm"
      >
        {t("detail.noClassSelected")}
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
      className={classId}
      entries={entries}
      hasMore={false}
      isPrincipal={false}
      filterStatus={filterStatus}
      createEntryAction={createEntryAction}
      submitEntryAction={submitEntryAction}
      approveEntryAction={approveEntryAction}
      rejectEntryAction={rejectEntryAction}
    />
  );
}
