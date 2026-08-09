import { getTranslations } from "next-intl/server";
import { makeListEntriesUseCase } from "@/bootstrap/di/class-log.di";
import { makeListMyTeacherClassesUseCase } from "@/bootstrap/di/teacher-class.di";
import { Link } from "@/bootstrap/i18n/routing";
import { tenantUrl } from "@/bootstrap/tenant";
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
type Params = Promise<{ tenant: string }>;

/** The teacher's classes — the picker's options, and the `classId → name`
 *  lookup for the header (it used to print the raw uuid). */
async function myClasses(): Promise<TeacherClass[]> {
  const result = await (await makeListMyTeacherClassesUseCase()).execute();
  return result.ok ? result.data : [];
}

export default async function TeacherClassLogPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { tenant } = await params;
  const sp = await searchParams;
  const classId = sp.classId;
  const filterStatus = sp.status as HomeroomEntryStatus | undefined;
  const classes = await myClasses();

  if (!classId) {
    const t = await getTranslations("classLog");
    return (
      <div className="m-8 rounded-[var(--edu-radius-card)] border border-border bg-card px-6 py-12 text-center">
        <p className="text-muted-foreground text-sm">
          {classes.length > 0
            ? t("detail.noClassSelected")
            : t("detail.noClasses")}
        </p>
        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {classes.map((cls) => (
            <li key={cls.id}>
              <Link
                href={`${tenantUrl(tenant, "/teacher/class-log")}?classId=${encodeURIComponent(cls.id)}`}
                className="inline-flex min-h-11 items-center rounded-[var(--edu-radius-btn)] border border-border bg-background px-4 font-semibold text-foreground text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                {cls.name}
              </Link>
            </li>
          ))}
        </ul>
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
