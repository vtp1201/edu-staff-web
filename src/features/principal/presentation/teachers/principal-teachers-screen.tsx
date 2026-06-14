"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PrincipalTeacher } from "@/features/principal/domain/teachers/entities/principal-teacher.entity";
import { cn } from "@/shared/utils";
import type { PrincipalTeachersVM } from "./principal-teachers-screen.i-vm";
import { TeacherAssignmentSheet } from "./teacher-assignment-sheet";

const STATUS_TONE: Record<PrincipalTeacher["status"], StatusTone> = {
  ACTIVE: "success",
  ON_LEAVE: "warning",
};

const MAX_VISIBLE_BADGES = 3;

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(-2)
    .join("")
    .toUpperCase();
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-edu-text-primary text-xs"
    >
      {initials(name)}
    </span>
  );
}

export function PrincipalTeachersScreen({
  teachers,
  classes,
  fetchError,
  loading = false,
  onAssignHomeroom,
  onAssignSubjectTeacher,
  onGetClassSubjects,
}: PrincipalTeachersVM) {
  const t = useTranslations("principalTeachers");
  const router = useRouter();
  const [activeTeacher, setActiveTeacher] = useState<PrincipalTeacher | null>(
    null,
  );

  const sortedTeachers = useMemo(
    () =>
      [...teachers].sort((a, b) =>
        a.displayName.localeCompare(b.displayName, "vi"),
      ),
    [teachers],
  );

  const isLoading = loading;

  if (fetchError) {
    return (
      <section className="space-y-4 p-6">
        <Header
          count={0}
          addLabel={t("addTeacher")}
          title={t("title")}
          subtitle={t("subtitle")}
        />
        <div
          role="alert"
          className="rounded-card border border-edu-error/30 bg-edu-error/10 p-6 text-center text-edu-error-text text-sm"
        >
          <p>{t(`errors.${fetchError}`)}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="mt-3"
          >
            {t("retry")}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 p-6">
      <Header
        count={teachers.length}
        addLabel={t("addTeacher")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <div
        aria-busy={isLoading}
        className="overflow-hidden rounded-card border border-border bg-card shadow-card"
      >
        {isLoading && (
          <span role="status" className="sr-only">
            {t("table.loading")}
          </span>
        )}
        <Table>
          <TableCaption className="sr-only">{t("table.caption")}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.teacher")}</TableHead>
              <TableHead>{t("table.primarySubject")}</TableHead>
              <TableHead>{t("table.homeroom")}</TableHead>
              <TableHead>{t("table.subjectAssignments")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRows />
            ) : sortedTeachers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground text-sm"
                >
                  <span role="status">{t("table.noTeachers")}</span>
                </TableCell>
              </TableRow>
            ) : (
              sortedTeachers.map((teacher) => {
                const visible = teacher.subjectAssignments.slice(
                  0,
                  MAX_VISIBLE_BADGES,
                );
                const overflow =
                  teacher.subjectAssignments.length - visible.length;
                return (
                  <TableRow key={teacher.teacherId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={teacher.displayName} />
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {teacher.displayName}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {teacher.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground text-sm">
                      {teacher.primarySubjectName ?? (
                        <span className="text-muted-foreground">
                          {t("table.unassigned")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {teacher.homeroomClassName ? (
                        <StatusBadge tone="success">
                          {teacher.homeroomClassName}
                        </StatusBadge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {t("table.unassigned")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {visible.length === 0 ? (
                          <span className="text-muted-foreground text-sm">
                            {t("table.unassigned")}
                          </span>
                        ) : (
                          visible.map((a) => (
                            <StatusBadge
                              key={a.classSubjectId}
                              tone={a.hasConflict ? "error" : "primary"}
                              className={cn(
                                "gap-1",
                                a.hasConflict && "items-center",
                              )}
                            >
                              {a.hasConflict && (
                                <span
                                  role="img"
                                  aria-label={t("sheet.conflictWarning")}
                                  className="inline-flex items-center"
                                >
                                  <TriangleAlertIcon
                                    className="size-3"
                                    aria-hidden="true"
                                  />
                                </span>
                              )}
                              {a.className} · {a.subjectName}
                            </StatusBadge>
                          ))
                        )}
                        {overflow > 0 && (
                          <StatusBadge tone="muted">
                            {t("table.overflowBadges", { n: overflow })}
                          </StatusBadge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={STATUS_TONE[teacher.status]}>
                        {t(`status.${teacher.status}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTeacher(teacher)}
                      >
                        {t("assignClass")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {activeTeacher && (
        <TeacherAssignmentSheet
          teacher={activeTeacher}
          classes={classes}
          onAssignHomeroom={onAssignHomeroom}
          onAssignSubjectTeacher={onAssignSubjectTeacher}
          onGetClassSubjects={onGetClassSubjects}
          onClose={() => setActiveTeacher(null)}
        />
      )}
    </section>
  );
}

function Header({
  count,
  addLabel,
  title,
  subtitle,
}: {
  count: number;
  addLabel: string;
  title: string;
  subtitle: string;
}) {
  const t = useTranslations("principalTeachers");
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="font-extrabold text-2xl text-foreground">{title}</h1>
          <StatusBadge tone="primary">
            {t("teacherCount", { count })}
          </StatusBadge>
        </div>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>
      <Button>{addLabel}</Button>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
        <TableRow key={`skeleton-${i}`}>
          {Array.from({ length: 6 }).map((__, j) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
            <TableCell key={`skeleton-cell-${j}`}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
