import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TeacherClass } from "@/features/teacher/domain/entities/teacher-class.entity";

/**
 * QA (US-E24.7): the page-level VM assembly — `toTiles` (tone thresholds,
 * "N+" cap suffix, the pendingLeave>0 gate), the GVBM(`cls.kpi`) +
 * GVCN(`homeroomKpi`) merge (incl. `demoFields` concatenation), and
 * `fetchHomeroomKpis`'s homeroom-only fan-out — all live in `page.tsx` and had
 * ZERO test before this file. The Storybook stories only exercise
 * `TeacherClassesScreen` with hand-built VMs; they never run this mapping.
 */

const listExec = vi.fn();
const kpiExec = vi.fn();

vi.mock("@/bootstrap/di/teacher-class.di", () => ({
  makeListMyTeacherClassesUseCase: async () => ({ execute: listExec }),
  makeGetHomeroomKpiUseCase: async () => ({ execute: kpiExec }),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

function cls(overrides: Partial<TeacherClass>): TeacherClass {
  return {
    id: "cls-1",
    name: "10A1",
    gradeLevel: 10,
    studentCount: 32,
    isHomeroom: false,
    roles: [],
    subjects: [],
    academicYearLabel: "2025–2026",
    ...overrides,
  };
}

async function renderPage() {
  const { default: Page } = await import("./page");
  return Page({
    params: Promise.resolve({ locale: "vi", tenant: "t1" }),
  }) as unknown as Promise<{ props: { vm: unknown } }>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TeacherClassesPage (US-E24.7)", () => {
  it("seeds an error VM (never crashes) when the list fetch fails", async () => {
    listExec.mockResolvedValue({
      ok: false,
      error: { type: "network-error" },
    });
    const el = await renderPage();
    expect(el.props.vm).toEqual({
      status: "error",
      errorKey: "network-error",
      classes: [],
    });
    expect(kpiExec).not.toHaveBeenCalled();
  });

  it("fans out GVCN KPI fetch ONLY for homeroom classes, not subject-only ones", async () => {
    listExec.mockResolvedValue({
      ok: true,
      data: [
        cls({ id: "cls-10a1", roles: ["homeroom", "subject"] }),
        cls({ id: "cls-11b2", name: "11B2", roles: ["subject"] }),
      ],
    });
    kpiExec.mockResolvedValue({ ok: true, data: { demoFields: [] } });

    await renderPage();

    expect(kpiExec).toHaveBeenCalledTimes(1);
    expect(kpiExec).toHaveBeenCalledWith("cls-10a1");
  });

  it("does not call the KPI use-case at all when no class is homeroom", async () => {
    listExec.mockResolvedValue({
      ok: true,
      data: [cls({ roles: ["subject"] })],
    });
    await renderPage();
    expect(kpiExec).not.toHaveBeenCalled();
  });

  it("merges GVBM (cls.kpi) + GVCN (homeroomKpi) tiles on a dual-role card, concatenating demoFields", async () => {
    listExec.mockResolvedValue({
      ok: true,
      data: [
        cls({
          id: "cls-10a1",
          roles: ["homeroom", "subject"],
          kpi: {
            absentToday: 2,
            pendingGrading: 5,
            demoFields: ["absentToday", "pendingGrading"],
          },
        }),
      ],
    });
    kpiExec.mockResolvedValue({
      ok: true,
      data: {
        attendanceRate: 0.94,
        openViolations: 2,
        openViolationsCapped: true,
        pendingLeave: 1,
        demoFields: [],
      },
    });

    const el = await renderPage();
    const vm = el.props.vm as {
      classes: Array<{ kpi?: { tiles: Array<Record<string, unknown>> } }>;
    };
    const tiles = vm.classes[0].kpi?.tiles ?? [];
    const byKey = Object.fromEntries(tiles.map((t) => [t.key, t]));

    expect(Object.keys(byKey)).toEqual([
      "absentToday",
      "pendingGrading",
      "attendanceRate",
      "openViolations",
      "pendingLeave",
    ]);
    // GVBM tiles keep their demo flag from `cls.kpi.demoFields`.
    expect(byKey.absentToday.isDemo).toBe(true);
    expect(byKey.pendingGrading.isDemo).toBe(true);
    // GVCN tiles came from the real conduct endpoints → never demo.
    expect(byKey.attendanceRate.isDemo).toBe(false);
    expect(byKey.attendanceRate.value).toBe(94);
    expect(byKey.attendanceRate.suffix).toBe("%");
    // Capped count → "+" suffix, never a fabricated exact total.
    expect(byKey.openViolations.suffix).toBe("+");
    expect(byKey.pendingLeave.value).toBe(1);
  });

  it("alertTone: a >0 alerting field turns error/warning, a zero stays neutral", async () => {
    listExec.mockResolvedValue({
      ok: true,
      data: [
        cls({
          id: "cls-11b2",
          roles: ["subject"],
          kpi: { absentToday: 0, pendingGrading: 3, demoFields: [] },
        }),
      ],
    });

    const el = await renderPage();
    const vm = el.props.vm as {
      classes: Array<{ kpi?: { tiles: Array<Record<string, unknown>> } }>;
    };
    const byKey = Object.fromEntries(
      (vm.classes[0].kpi?.tiles ?? []).map((t) => [t.key, t]),
    );
    expect(byKey.absentToday.tone).toBe("neutral");
    expect(byKey.pendingGrading.tone).toBe("warning");
  });

  it("omits pendingLeave tile entirely when the count is zero (AC: only >0 earns a tile)", async () => {
    listExec.mockResolvedValue({
      ok: true,
      data: [cls({ id: "cls-10a1", roles: ["homeroom"] })],
    });
    kpiExec.mockResolvedValue({
      ok: true,
      data: { openViolations: 0, pendingLeave: 0, demoFields: [] },
    });

    const el = await renderPage();
    const vm = el.props.vm as {
      classes: Array<{ kpi?: { tiles: Array<Record<string, unknown>> } }>;
    };
    const keys = (vm.classes[0].kpi?.tiles ?? []).map((t) => t.key);
    expect(keys).toContain("openViolations");
    expect(keys).not.toContain("pendingLeave");
  });

  it("omits the `kpi` key entirely (not an empty tiles array) when no source produced any field — card must not go lopsided", async () => {
    listExec.mockResolvedValue({
      ok: true,
      data: [cls({ id: "cls-12c1", name: "12C1", roles: ["subject"] })],
    });

    const el = await renderPage();
    const vm = el.props.vm as { classes: Array<Record<string, unknown>> };
    expect("kpi" in vm.classes[0]).toBe(false);
  });

  it("a failed homeroom KPI call (allSettled rejection) leaves that class with no GVCN tiles, never crashes the page", async () => {
    listExec.mockResolvedValue({
      ok: true,
      data: [cls({ id: "cls-10a1", roles: ["homeroom"] })],
    });
    kpiExec.mockRejectedValue(new Error("network"));

    const el = await renderPage();
    const vm = el.props.vm as { classes: Array<Record<string, unknown>> };
    expect("kpi" in vm.classes[0]).toBe(false);
  });

  it("passes roles/subjects/hubHref straight through for the 4-card GVCN+GVBM scenario (AC)", async () => {
    listExec.mockResolvedValue({
      ok: true,
      data: [
        cls({
          id: "cls-10a1",
          name: "10A1",
          roles: ["homeroom", "subject"],
          subjects: [{ id: "sub-math", name: "Toán" }],
        }),
        cls({
          id: "cls-10a2",
          name: "10A2",
          roles: ["subject"],
          subjects: [{ id: "sub-math", name: "Toán" }],
        }),
        cls({
          id: "cls-11b2",
          name: "11B2",
          roles: ["subject"],
          subjects: [{ id: "sub-math", name: "Toán" }],
        }),
        cls({
          id: "cls-12c1",
          name: "12C1",
          roles: ["subject"],
          subjects: [{ id: "sub-math", name: "Toán" }],
        }),
      ],
    });

    const el = await renderPage();
    const vm = el.props.vm as {
      classes: Array<{
        id: string;
        roles: string[];
        subjects: Array<{ name: string }>;
        hubHref: string;
      }>;
    };
    expect(vm.classes).toHaveLength(4);
    expect(vm.classes[0].roles).toEqual(["homeroom", "subject"]);
    expect(vm.classes.slice(1).every((c) => c.roles.length === 1)).toBe(true);
    // US-E24.8: the card opens the class HUB directly (the legacy
    // `/students` route still 308s there, but a card must not need the hop).
    expect(vm.classes[0].hubHref).toBe(
      "/vi/t/t1/teacher/classes/cls-10a1?tab=students",
    );
  });
});
