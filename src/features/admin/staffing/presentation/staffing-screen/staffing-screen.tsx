"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffingAssignmentsScreen } from "../staffing-assignments-screen/staffing-assignments-screen";
import { StaffingDepartmentsScreen } from "../staffing-departments-screen/staffing-departments-screen";
import { StaffingPositionTitlesScreen } from "../staffing-position-titles-screen/staffing-position-titles-screen";
import type { StaffingScreenProps } from "./staffing-screen.i-vm";

export function StaffingScreen({
  initialDepartments,
  initialPositionTitles,
  initialAssignments,
  isAdmin,
  onCreateDepartment,
  onPatchDepartment,
  onArchiveDepartment,
  onCreatePositionTitle,
  onPatchPositionTitle,
  onArchivePositionTitle,
  onAssignPosition,
  onRevokeAssignment,
  onCopyAssignments,
}: StaffingScreenProps) {
  const t = useTranslations("staffing.tabs");

  // ACTIVE titles are the only valid assignment targets.
  const activeTitles = useMemo(
    () => initialPositionTitles.filter((pt) => pt.status === "ACTIVE"),
    [initialPositionTitles],
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <Tabs defaultValue="departments" className="gap-6">
        <TabsList>
          <TabsTrigger value="departments">{t("departments")}</TabsTrigger>
          <TabsTrigger value="positionTitles">
            {t("positionTitles")}
          </TabsTrigger>
          <TabsTrigger value="assignments">{t("assignments")}</TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          <StaffingDepartmentsScreen
            initialDepartments={initialDepartments}
            isAdmin={isAdmin}
            onCreateDepartment={onCreateDepartment}
            onPatchDepartment={onPatchDepartment}
            onArchiveDepartment={onArchiveDepartment}
          />
        </TabsContent>

        <TabsContent value="positionTitles">
          <StaffingPositionTitlesScreen
            initialPositionTitles={initialPositionTitles}
            isAdmin={isAdmin}
            onCreatePositionTitle={onCreatePositionTitle}
            onPatchPositionTitle={onPatchPositionTitle}
            onArchivePositionTitle={onArchivePositionTitle}
          />
        </TabsContent>

        <TabsContent value="assignments">
          <StaffingAssignmentsScreen
            initialAssignments={initialAssignments}
            positionTitles={activeTitles}
            isAdmin={isAdmin}
            onAssignPosition={onAssignPosition}
            onRevokeAssignment={onRevokeAssignment}
            onCopyAssignments={onCopyAssignments}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
