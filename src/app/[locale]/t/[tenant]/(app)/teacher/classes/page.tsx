import { getTranslations } from "next-intl/server";
import {
  makeGetHomeroomKpiUseCase,
  makeListMyTeacherClassesUseCase,
} from "@/bootstrap/di/teacher-class.di";
import type {
  TeacherClass,
  TeacherClassKpi,
  TeacherClassKpiField,
} from "@/features/teacher/domain/entities/teacher-class.entity";
import { TeacherClassesScreen } from "@/features/teacher/presentation/teacher-classes-screen/teacher-classes-screen";
import type {
  KpiTileVM,
  TeacherClassesScreenVM,
} from "@/features/teacher/presentation/teacher-classes-screen/teacher-classes-screen.i-vm";
import { classHubBase, classHubHref } from "@/shared/class-hub-href";

type Labels = Record<TeacherClassKpiField, string>;

/** `> 0` means "needs your attention" for the alerting tiles; anything else
 *  stays neutral. Resolved here so the tile component is a pure renderer
 *  (same convention as `mapScheduleStatusTone`). */
function alertTone(value: number, tone: KpiTileVM["tone"]): KpiTileVM["tone"] {
  return value > 0 ? tone : "neutral";
}

function isDemo(
  kpi: Partial<TeacherClassKpi>,
  field: TeacherClassKpiField,
): boolean {
  return (kpi.demoFields ?? []).includes(field);
}

/** Builds the ordered tile list for one class. Both role tile-sets render on a
 *  dual-role card (design bundle v3 `ChClassList` renders the GVBM row AND the
 *  GVCN row). A field no source produced is skipped — never a fake zero. */
function toTiles(
  kpi: Partial<TeacherClassKpi> | undefined,
  labels: Labels,
): KpiTileVM[] {
  if (!kpi) return [];
  const tiles: KpiTileVM[] = [];

  if (kpi.absentToday !== undefined)
    tiles.push({
      key: "absentToday",
      value: kpi.absentToday,
      label: labels.absentToday,
      tone: alertTone(kpi.absentToday, "error"),
      isDemo: isDemo(kpi, "absentToday"),
    });

  if (kpi.pendingGrading !== undefined)
    tiles.push({
      key: "pendingGrading",
      value: kpi.pendingGrading,
      label: labels.pendingGrading,
      tone: alertTone(kpi.pendingGrading, "warning"),
      isDemo: isDemo(kpi, "pendingGrading"),
    });

  if (kpi.attendanceRate !== undefined)
    tiles.push({
      key: "attendanceRate",
      value: Math.round(kpi.attendanceRate * 100),
      suffix: "%",
      label: labels.attendanceRate,
      tone: "neutral",
      isDemo: isDemo(kpi, "attendanceRate"),
    });

  if (kpi.openViolations !== undefined)
    tiles.push({
      key: "openViolations",
      value: kpi.openViolations,
      // Counted over one capped page (repo) → the real number is >= this, so
      // the tile reads "N+" instead of asserting an exact total.
      ...(kpi.openViolationsCapped ? { suffix: "+" } : {}),
      label: labels.openViolations,
      tone: alertTone(kpi.openViolations, "error"),
      isDemo: isDemo(kpi, "openViolations"),
    });

  // "Đơn nghỉ chờ" only earns a tile when there is something to act on (AC).
  if (kpi.pendingLeave !== undefined && kpi.pendingLeave > 0)
    tiles.push({
      key: "pendingLeave",
      value: kpi.pendingLeave,
      label: labels.pendingLeave,
      tone: "warning",
      isDemo: isDemo(kpi, "pendingLeave"),
    });

  return tiles;
}

/** GVCN KPI needs one extra call per homeroom class (usually 0–1 per teacher).
 *  `allSettled` so one failing class never costs the whole list. */
async function fetchHomeroomKpis(
  classes: TeacherClass[],
): Promise<Map<string, Partial<TeacherClassKpi>>> {
  const homeroom = classes.filter((c) => c.roles.includes("homeroom"));
  if (homeroom.length === 0) return new Map();

  const useCase = await makeGetHomeroomKpiUseCase();
  const settled = await Promise.allSettled(
    homeroom.map(
      async (cls) => [cls.id, await useCase.execute(cls.id)] as const,
    ),
  );

  const byClass = new Map<string, Partial<TeacherClassKpi>>();
  for (const entry of settled) {
    if (entry.status !== "fulfilled") continue;
    const [classId, result] = entry.value;
    if (result.ok) byClass.set(classId, result.data);
  }
  return byClass;
}

export default async function TeacherClassesPage({
  params,
}: {
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const { locale, tenant } = await params;
  const base = classHubBase(locale, tenant);
  const useCase = await makeListMyTeacherClassesUseCase();
  const result = await useCase.execute();

  if (!result.ok) {
    const errorVm: TeacherClassesScreenVM = {
      status: "error",
      errorKey: result.error.type,
      classes: [],
    };
    return <TeacherClassesScreen vm={errorVm} />;
  }

  const t = await getTranslations("teacherClasses");
  const labels: Labels = {
    absentToday: t("card.kpi.absentToday"),
    pendingGrading: t("card.kpi.pendingGrading"),
    attendanceRate: t("card.kpi.attendanceRate"),
    openViolations: t("card.kpi.openViolations"),
    pendingLeave: t("card.kpi.pendingLeave"),
  };

  const homeroomKpis = await fetchHomeroomKpis(result.data);

  const vm: TeacherClassesScreenVM = {
    status: "ready",
    classes: result.data.map((cls) => {
      const homeroomKpi = homeroomKpis.get(cls.id);
      const merged: Partial<TeacherClassKpi> | undefined =
        cls.kpi || homeroomKpi
          ? {
              ...cls.kpi,
              ...homeroomKpi,
              demoFields: [
                ...(cls.kpi?.demoFields ?? []),
                ...(homeroomKpi?.demoFields ?? []),
              ],
            }
          : undefined;
      const tiles = toTiles(merged, labels);

      return {
        id: cls.id,
        name: cls.name,
        studentCount: cls.studentCount,
        roles: cls.roles,
        subjects: cls.subjects,
        // Absent (not an empty array) when nothing resolved — the card then
        // renders no tile container at all (AC: grid must not go lopsided).
        ...(tiles.length > 0 ? { kpi: { tiles } } : {}),
        // Straight into the class hub (US-E24.8) — the legacy
        // `/classes/<id>/students` route stays as a 308 alias for old links.
        studentsHref: classHubHref(base, cls.id, "students"),
      };
    }),
  };

  return <TeacherClassesScreen vm={vm} />;
}
