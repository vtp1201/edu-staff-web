"use client";

import { CalendarX, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { AttendanceTodayCard } from "./attendance-today-card";
import { HomeroomCardError } from "./homeroom-card-error";
import type { HomeroomLeaveActions, HomeroomTabVm } from "./homeroom-tab.i-vm";
import { OpenViolationsCard } from "./open-violations-card";
import { PendingLeaveCard } from "./pending-leave-card";

export interface HomeroomTabProps {
  vm: HomeroomTabVm;
  actions: HomeroomLeaveActions;
}

/**
 * Content-derived remount key for `PendingLeaveCard`.
 *
 * NOT cosmetic. That card seeds `useState(vm.requests)` once; a
 * `router.refresh()` after a failed decision re-runs this RSC with a NEW list
 * but React reuses the mounted instance (same type, same slot), so `useState`
 * silently discards it and the "refetch" the AC promises never reaches the
 * screen. There is no `?week=`-style URL param to key on here — the tab url is
 * unchanged across a refresh — so the key IS the data: the sorted id set.
 *
 * Sorted so a server-side reordering of the same set does not remount, and
 * content-derived (not `Date.now()`) so a same-data refresh does not throw away
 * an open dialog on an unrelated row.
 */
function leaveSignature(vm: HomeroomTabVm): string {
  return vm.leave.ok
    ? vm.leave.data.requests
        .map((r) => r.id)
        .sort()
        .join(",")
    : "error";
}

/**
 * Class-hub "Chủ nhiệm" tab (US-E24.11) — GVCN only (the shell's
 * `resolveClassHubTab` owns that gate; this component is never rendered for a
 * subject-only teacher).
 *
 * Three cards, each fed by its own settled read. This is the ONLY place the
 * ok/error union is inspected: every card component below takes a
 * success-shaped ViewModel and never learns an error state exists.
 *
 * A CLIENT component even though it fetches nothing: every one of its five
 * states (three cards × ok/error, plus the leave inbox's own interactions) has
 * to be provable as a Storybook interaction story, which cannot render an async
 * RSC. It is a thin, data-free presentational shell — all the server work lives
 * in `homeroom-vm.ts` and `page.tsx`, and `actions` arrives as Server Action
 * REFS, exactly like `TimetableTabBody`.
 */
export function HomeroomTab({ vm, actions }: HomeroomTabProps) {
  const t = useTranslations("teacherClasses.hub.homeroom.errors");

  // design-spec `homeroomTab.grid`: auto-fit minmax(300px, 1fr). Held back to a
  // single column below `sm` — a 300px track cannot fit a 320px viewport's
  // content box, and an overflowing grid is a hard a11y break (accessibility.md
  // "không vỡ ở 320px").
  return (
    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
      {vm.attendance.ok ? (
        <AttendanceTodayCard vm={vm.attendance.data} />
      ) : (
        <HomeroomCardError
          icon={CalendarX}
          title={t("attendance")}
          body={t("body")}
          retryLabel={t("retry")}
          retryHref={vm.attendance.retryHref}
        />
      )}

      {vm.violations.ok ? (
        <OpenViolationsCard vm={vm.violations.data} />
      ) : (
        <HomeroomCardError
          icon={ShieldAlert}
          title={t("violations")}
          body={t("body")}
          retryLabel={t("retry")}
          retryHref={vm.violations.retryHref}
        />
      )}

      {vm.leave.ok ? (
        <PendingLeaveCard
          key={leaveSignature(vm)}
          vm={vm.leave.data}
          classId={vm.classId}
          actions={actions}
        />
      ) : (
        <HomeroomCardError
          icon={CalendarX}
          title={t("leave")}
          body={t("body")}
          retryLabel={t("retry")}
          retryHref={vm.leave.retryHref}
        />
      )}
    </div>
  );
}
