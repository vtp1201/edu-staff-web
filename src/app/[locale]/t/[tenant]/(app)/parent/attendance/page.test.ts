/**
 * US-E20.5 fix round — end-to-end posture of the `/parent/attendance` RSC.
 *
 * Asserted by inspecting the `vm` prop of the returned
 * `<ParentAttendanceContainer>` element (the RSC returns a React element
 * without rendering it), with the REAL DI factory + repositories behind it —
 * so this proves the whole page → di → repository → use-case chain, not just
 * the factory.
 *
 * The point: with `NEXT_PUBLIC_USE_MOCK` unset or `"false"` (a real/production
 * environment) a parent must get `error: "forbidden"` and ZERO attendance rows,
 * never fabricated present/late/excused/absent records for their real child.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ParentAttendanceScreenVM } from "@/features/parent-attendance/presentation/parent-attendance-screen/parent-attendance-screen.i-vm";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
});

async function vmWithEnv(
  value: string | undefined,
): Promise<ParentAttendanceScreenVM> {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  const { default: Page } = await import("./page");
  const element = (await Page({ searchParams: Promise.resolve({}) })) as {
    props: { vm: ParentAttendanceScreenVM };
  };
  return element.props.vm;
}

describe("ParentAttendancePage", () => {
  it('shows mock records only when NEXT_PUBLIC_USE_MOCK="true"', async () => {
    const vm = await vmWithEnv("true");
    expect(vm.error).toBeNull();
    expect(vm.records.length).toBeGreaterThan(0);
    expect(vm.activeChildId).not.toBeNull();
  });

  for (const value of [undefined, "false"] as const) {
    it(`degrades to the honest forbidden state with NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      const vm = await vmWithEnv(value);
      expect(vm.error).toBe("forbidden");
      // The whole point: no invented attendance for a real child.
      expect(vm.records).toEqual([]);
      // The rest of the screen still works (switcher + range control render).
      expect(vm.childList.length).toBeGreaterThan(0);
      expect(vm.range.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  }
});
