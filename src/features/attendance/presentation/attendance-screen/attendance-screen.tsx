"use client";

import { CheckCheck, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useReducer, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AttendanceRecord } from "../../domain/entities/attendance-record.entity";
import type { AttendanceStatus } from "../../domain/entities/attendance-status.entity";
import { AttendanceFilters } from "./attendance-filters";
import { AttendanceHistoryTab } from "./attendance-history-tab";
import { AttendanceRosterTable } from "./attendance-roster-table";
import type { AttendanceScreenVM } from "./attendance-screen.i-vm";
import { AttendanceSummaryCard } from "./attendance-summary-card";

type State = {
  records: AttendanceRecord[];
  dirty: boolean;
};

type Action =
  | { type: "init"; records: AttendanceRecord[] }
  | { type: "set-status"; studentId: string; status: AttendanceStatus }
  | { type: "set-all-present" }
  | { type: "mark-clean" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "init":
      return { records: action.records, dirty: false };
    case "set-status": {
      const records = state.records.map((r) =>
        r.studentId === action.studentId ? { ...r, status: action.status } : r,
      );
      return { records, dirty: true };
    }
    case "set-all-present": {
      const records = state.records.map((r) => ({
        ...r,
        status: "present" as AttendanceStatus,
      }));
      return { records, dirty: true };
    }
    case "mark-clean":
      return { ...state, dirty: false };
    default:
      return state;
  }
}

export function AttendanceScreen({
  classes,
  roster,
  history,
  filters,
  saveAction,
}: AttendanceScreenVM) {
  const t = useTranslations("attendance");
  const [state, dispatch] = useReducer(reducer, {
    records: roster?.records ?? [],
    dirty: false,
  });
  const [isPending, startTransition] = useTransition();

  // Re-init local state when a new roster arrives from RSC.
  useEffect(() => {
    dispatch({ type: "init", records: roster?.records ?? [] });
  }, [roster?.records]);

  function onSave() {
    if (!roster) return;
    startTransition(async () => {
      const result = await saveAction(roster.period.id, state.records);
      if (result.ok) {
        toast.success(t("actions.saved"));
        dispatch({ type: "mark-clean" });
      } else {
        toast.error(result.message || t("actions.saveFailed"));
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
      </header>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <AttendanceFilters
            classes={classes}
            classId={filters.classId}
            date={filters.date}
            period={filters.period}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">{t("tabs.today")}</TabsTrigger>
          <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {!roster ? (
            <div className="rounded-[var(--edu-radius-card)] border border-border p-8 text-center text-sm text-muted-foreground">
              {t("empty")}
            </div>
          ) : (
            <>
              <AttendanceSummaryCard records={state.records} />

              <Card>
                <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
                  <div className="text-sm text-muted-foreground">
                    {roster.period.className} · {roster.period.subject} ·{" "}
                    {roster.period.date} · Tiết {roster.period.period}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => dispatch({ type: "set-all-present" })}
                    >
                      <CheckCheck className="mr-1.5 size-4" />
                      {t("actions.allPresent")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={onSave}
                      disabled={!state.dirty || isPending}
                    >
                      <Save className="mr-1.5 size-4" />
                      {isPending ? t("actions.saving") : t("actions.save")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <AttendanceRosterTable
                    records={state.records}
                    onChange={(studentId, status) =>
                      dispatch({ type: "set-status", studentId, status })
                    }
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="history">
          <AttendanceHistoryTab history={history} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
