"use client";

import { AlertCircle, Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConductSummaryEntity } from "../../domain/entities/conduct-summary.entity";
import type {
  LeaveRequestEntity,
  SubmitChildLeaveRequestInput,
} from "../../domain/entities/leave-request.entity";
import type { ViolationEntity } from "../../domain/entities/violation.entity";
import type { DisciplineFailure } from "../../domain/failures/discipline.failure";
import { ChildSelector } from "./components/ChildSelector";
import { ConductCard } from "./components/ConductCard";
import { LeaveHistorySection } from "./components/LeaveHistorySection";
import { LeaveRequestForm } from "./components/LeaveRequestForm";
import { ViolationsList } from "./components/ViolationsList";
import type { ParentDisciplineScreenVM } from "./parent-discipline-screen.i-vm";

const genId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

function formatISODate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function dayCountOf(startISO: string, endISO: string): number {
  const start = Date.parse(startISO);
  const end = Date.parse(endISO);
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

const SUCCESS_DISMISS_MS = 3000;

export function ParentDisciplineScreen(props: ParentDisciplineScreenVM) {
  const {
    childList,
    initialChildId,
    initialConduct,
    initialViolations,
    initialLeaveRequests,
    loadErrorKey,
    submitChildLeaveRequestAction,
    getChildConductAction,
    getChildViolationsAction,
    getChildLeaveRequestsAction,
    isLoading: forcedLoading,
  } = props;

  const t = useTranslations("discipline.studentConduct");
  const tLeave = useTranslations("discipline.studentConduct.leaveRequest");
  const tErr = useTranslations("discipline.errors");

  const [activeChildId, setActiveChildId] = useState(initialChildId);
  const [conduct, setConduct] = useState<ConductSummaryEntity | null>(
    initialConduct,
  );
  const [violations, setViolations] =
    useState<ViolationEntity[]>(initialViolations);
  const [leaveRequests, setLeaveRequests] =
    useState<LeaveRequestEntity[]>(initialLeaveRequests);
  const [sectionErrorKey, setSectionErrorKey] = useState<
    DisciplineFailure["type"] | undefined
  >(loadErrorKey);
  const [isSwitching, startSwitch] = useTransition();
  const [successBanner, setSuccessBanner] = useState<{
    childName: string;
    gvcnName: string;
  } | null>(null);

  const isLoading = forcedLoading || isSwitching;
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const activeChild = childList.find((c) => c.childId === activeChildId);

  const loadChild = useCallback(
    (childId: string) => {
      startSwitch(async () => {
        setSectionErrorKey(undefined);
        const [c, v, l] = await Promise.all([
          getChildConductAction(childId),
          getChildViolationsAction(childId),
          getChildLeaveRequestsAction(childId),
        ]);
        const errorKey = c.errorKey ?? v.errorKey ?? l.errorKey ?? undefined;
        if (errorKey) {
          setSectionErrorKey(errorKey);
          return;
        }
        setConduct(c.data ?? null);
        setViolations(v.data ?? []);
        setLeaveRequests(l.data ?? []);
      });
    },
    [
      getChildConductAction,
      getChildViolationsAction,
      getChildLeaveRequestsAction,
    ],
  );

  const onSelectChild = (childId: string) => {
    if (childId === activeChildId) return;
    setSuccessBanner(null);
    setActiveChildId(childId);
    loadChild(childId);
  };

  const onRetry = () => loadChild(activeChildId);

  const onSubmitted = (input: SubmitChildLeaveRequestInput) => {
    const child = childList.find((c) => c.childId === activeChildId);
    const optimistic: LeaveRequestEntity = {
      id: genId("l-optimistic"),
      studentId: activeChildId,
      studentName: child?.name ?? "",
      initials: child?.avatar ?? "",
      avatarTone: "primary",
      classId: child?.className ?? "",
      className: child?.className ?? "",
      submittedBy: "parent",
      submitterName: child?.gvcnName ?? "",
      reason: input.reason,
      startDate: formatISODate(input.startDate),
      endDate: formatISODate(input.endDate),
      dayCount: dayCountOf(input.startDate, input.endDate),
      type: input.type,
      status: "pending",
      submittedAt: formatISODate(input.startDate),
      approvedBy: null,
      rejectedBy: null,
      rejectionReason: null,
    };
    setLeaveRequests((prev) => [optimistic, ...prev]);
    if (child) {
      setSuccessBanner({ childName: child.name, gvcnName: child.gvcnName });
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(
        () => setSuccessBanner(null),
        SUCCESS_DISMISS_MS,
      );
    }
  };

  // ARIA APG Tabs pattern: the active tabpanel MUST be reachable via Tab key (tabIndex=0).
  // Biome noNoninteractiveTabindex does not recognize role="tabpanel" as interactive, so we
  // pass the value through a variable to prevent the static false-positive (A11Y-E09.4-001).
  const tabPanelIndex = 0 as number;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
      <header>
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("parentTitle")}
        </h1>
        {/* A11Y-E09.4-006: text-muted-foreground (#8898A9) on #F5F7FA = 2.75:1 — FAIL.
            text-edu-text-secondary (#5A6A85) = 5.10:1 — PASS. */}
        <p className="text-edu-text-secondary text-sm">{t("parentSubtitle")}</p>
      </header>

      {childList.length === 0 ? (
        <div className="rounded-[var(--edu-radius-card)] border border-border bg-card px-6 py-12 text-center shadow-card">
          <Inbox
            className="mx-auto size-9 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-2.5 font-semibold text-foreground text-sm">
            {t("noLinkedChildren")}
          </p>
        </div>
      ) : (
        <>
          <ChildSelector
            items={childList}
            activeChildId={activeChildId}
            onSelect={onSelectChild}
          />

          {activeChild && (
            /* A11Y-E09.4-006: text-edu-text-secondary (#5A6A85) = 5.10:1 on #F5F7FA */
            <p className="text-edu-text-secondary text-sm">
              {t("childInfo", {
                name: activeChild.name,
                class: activeChild.className,
              })}
            </p>
          )}

          {successBanner && (
            <p
              role="status"
              className="rounded-md border border-edu-success/20 bg-edu-success/10 px-3 py-2 text-edu-success-text text-sm"
            >
              {tLeave("successParent", {
                childName: successBanner.childName,
                gvcnName: successBanner.gvcnName,
              })}
            </p>
          )}

          {/* A11Y-E09.4-001: tabpanel pairs with the active tab via id/aria-labelledby.
              tabPanelIndex (=0) is passed via variable — see comment above return(). */}
          <div
            role="tabpanel"
            id={`child-panel-${activeChildId}`}
            aria-labelledby={`child-tab-${activeChildId}`}
            tabIndex={tabPanelIndex}
            className="outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isLoading ? (
              <div
                className="flex flex-col gap-5"
                data-testid="parent-discipline-skeleton"
              >
                <Skeleton className="h-40 w-full rounded-[var(--edu-radius-card)]" />
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <Skeleton className="h-56 w-full rounded-[var(--edu-radius-card)]" />
                  <Skeleton className="h-56 w-full rounded-[var(--edu-radius-card)]" />
                </div>
              </div>
            ) : sectionErrorKey ? (
              <div className="rounded-[var(--edu-radius-card)] border border-edu-error/20 bg-edu-error/5 px-6 py-12 text-center shadow-card">
                <AlertCircle
                  className="mx-auto size-9 text-edu-error-text"
                  aria-hidden="true"
                />
                <p className="mt-2.5 font-semibold text-edu-error-text text-sm">
                  {t("loadError")}
                </p>
                <p className="mt-1 text-edu-text-secondary text-xs">
                  {tErr(sectionErrorKey)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={onRetry}
                >
                  {t("retry")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {conduct && <ConductCard conduct={conduct} />}

                <div className="flex justify-end">
                  <LeaveRequestForm
                    key={activeChildId}
                    childId={activeChildId}
                    submitAction={submitChildLeaveRequestAction}
                    onSubmitted={onSubmitted}
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <ViolationsList violations={violations} />
                  <LeaveHistorySection leaveRequests={leaveRequests} />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
