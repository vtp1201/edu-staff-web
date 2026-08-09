import { getTranslations } from "next-intl/server";
import { makeRosterRepository } from "@/bootstrap/di/admin-roster.di";
import { makeListEntriesUseCase } from "@/bootstrap/di/class-log.di";
import { resolveCurrentAcademicYear } from "@/bootstrap/lib/resolve-current-term";
import type { HomeroomEntry } from "@/features/class-log/domain/entities/homeroom-entry.entity";
import type { HomeroomEntryStatus } from "@/features/class-log/domain/entities/homeroom-entry-status.entity";
import { ClassLogScreen } from "@/features/class-log/presentation/class-log-screen/class-log-screen";
import {
  approveEntryAction,
  createEntryAction,
  rejectEntryAction,
  reviseEntryAction,
  submitEntryAction,
} from "./actions";

type SearchParams = Promise<{ classId?: string; status?: string }>;

export default async function PrincipalClassLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const filterStatus = sp.status as HomeroomEntryStatus | undefined;

  // The principal saw "pick a class" with nothing to pick — this page had no
  // class list at all. Same source as the principal roster screen (the year is
  // mandatory for an admin-tier caller, see that page).
  const classesResult = await (await makeRosterRepository()).getClasses({
    academicYear: await resolveCurrentAcademicYear().catch(() => undefined),
  });
  const classes = classesResult.ok
    ? classesResult.data.map((c) => ({ id: c.id, name: c.name }))
    : [];
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
      classes={classes}
      entries={entries}
      hasMore={false}
      isPrincipal={true}
      filterStatus={filterStatus}
      createEntryAction={createEntryAction}
      submitEntryAction={submitEntryAction}
      reviseEntryAction={reviseEntryAction}
      approveEntryAction={approveEntryAction}
      rejectEntryAction={rejectEntryAction}
    />
  );
}
