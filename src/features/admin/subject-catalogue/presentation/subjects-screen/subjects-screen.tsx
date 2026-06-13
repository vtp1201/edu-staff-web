"use client";

import { Archive, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/shared/utils";
import type { ClassSubject } from "../../domain/entities/class-subject.entity";
import type { Subject } from "../../domain/entities/subject.entity";
import { ConceptBadge } from "../shared/concept-badge";
import { CreateParentDialog } from "../shared/create-parent-dialog";
import { CreateSubjectDialog } from "../shared/create-subject-dialog";
import { SubjectDetailSheet } from "./subject-detail-sheet";
import type {
  ParentWithSubjectsVM,
  SubjectsScreenProps,
} from "./subjects-screen.i-vm";

export function SubjectsScreen({
  initialParents,
  gradeRange,
  onCreateParent,
  onCreateSubject,
  onGetSubject,
  onPatchSubject,
  onArchiveSubject,
}: SubjectsScreenProps) {
  const t = useTranslations("subjectCatalogue.subjects");

  const [parents, setParents] =
    useState<ParentWithSubjectsVM[]>(initialParents);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialParents[0]?.id ?? null,
  );
  const [createParentOpen, setCreateParentOpen] = useState(false);
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Subject | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [detailSubject, setDetailSubject] = useState<Subject | null>(null);
  const [detailOfferings, setDetailOfferings] = useState<ClassSubject[]>([]);

  const selected = useMemo(
    () => parents.find((p) => p.id === selectedId) ?? null,
    [parents, selectedId],
  );

  const updateSubjectInState = (subject: Subject) =>
    setParents((prev) =>
      prev.map((p) =>
        p.id === subject.parentId
          ? {
              ...p,
              subjects: p.subjects.map((s) =>
                s.id === subject.id ? subject : s,
              ),
            }
          : p,
      ),
    );

  const handleOpenDetail = async (subjectId: string) => {
    setSheetOpen(true);
    setSheetLoading(true);
    setDetailSubject(null);
    setDetailOfferings([]);
    const result = await onGetSubject(subjectId);
    setSheetLoading(false);
    if (result.ok) {
      setDetailSubject(result.subject);
      setDetailOfferings(result.classOfferings);
    }
  };

  const handleArchive = async (subject: Subject) => {
    const result = await onArchiveSubject(subject.id, subject);
    if (result.ok) {
      updateSubjectInState({ ...subject, status: "ARCHIVED" });
    }
    setArchiveTarget(null);
  };

  if (parents.length === 0) {
    return (
      <TooltipProvider>
        <div className="mx-auto max-w-6xl p-4 sm:p-6">
          <Header
            title={t("title")}
            subtitle={t("subtitle")}
            action={
              <Button onClick={() => setCreateParentOpen(true)}>
                <Plus aria-hidden="true" className="size-4" />
                {t("addDepartmentButton")}
              </Button>
            }
          />
          <div className="mt-8 flex flex-col items-center gap-3 rounded-[var(--edu-radius-card)] border border-dashed border-border bg-card py-16 text-center">
            <h2 className="text-base font-bold text-foreground">
              {t("noDepartments")}
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {t("noDepartmentsSubtitle")}
            </p>
            <Button className="mt-2" onClick={() => setCreateParentOpen(true)}>
              <Plus aria-hidden="true" className="size-4" />
              {t("addFirstDepartment")}
            </Button>
          </div>
        </div>
        <CreateParentDialog
          open={createParentOpen}
          onOpenChange={setCreateParentOpen}
          onSubmit={async (data) => {
            const result = await onCreateParent(data);
            if (result.ok) {
              setParents((prev) => [
                { ...result.parent, subjects: [] },
                ...prev,
              ]);
              setSelectedId(result.parent.id);
            }
            return result;
          }}
        />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
        <Header
          title={t("title")}
          subtitle={t("subtitle")}
          action={
            <Button variant="outline" onClick={() => setCreateParentOpen(true)}>
              <Plus aria-hidden="true" className="size-4" />
              {t("addDepartmentButton")}
            </Button>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[35%_65%]">
          {/* Master: department list */}
          <nav aria-label={t("title")} className="flex flex-col gap-2">
            <ul className="flex flex-col gap-1">
              {parents.map((p) => {
                const active = p.id === selectedId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => setSelectedId(p.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-[var(--edu-radius-btn)] px-3 py-2.5 text-left",
                        "motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-l-[3px] border-primary bg-primary/12 font-bold text-foreground"
                          : "border-l-[3px] border-transparent text-foreground hover:bg-muted",
                      )}
                    >
                      <span className="flex flex-col">
                        <span className="text-sm">{p.name}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {p.subjects.length} {t("subjectUnit")}
                        </span>
                      </span>
                      <ConceptBadge parent={p} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Detail: grade-scoped subjects */}
          <section className="flex flex-col gap-4">
            {!selected ? (
              <p className="rounded-[var(--edu-radius-card)] border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                {t("selectDepartment")}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-extrabold text-foreground">
                    {selected.name}
                  </h2>
                  <Button
                    size="sm"
                    onClick={() => setCreateSubjectOpen(true)}
                    disabled={!gradeRange}
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    {t("addSubjectButton")}
                  </Button>
                </div>

                {gradeRange ? (
                  <p className="rounded-[var(--edu-radius-btn)] bg-edu-info/10 p-3 text-xs text-edu-text-primary">
                    {t("gradeRangeInfo")}{" "}
                    <strong>
                      {t("gradeRange", {
                        range: `${gradeRange.minGrade}–${gradeRange.maxGrade}`,
                      })}
                    </strong>
                    . {t("gradeRangeNote")}
                  </p>
                ) : (
                  <div className="rounded-[var(--edu-radius-btn)] bg-edu-warning/15 p-3">
                    <p className="text-sm font-semibold text-edu-warning-foreground">
                      {t("noGradeRangeTitle")}
                    </p>
                    <p className="text-xs text-edu-warning-foreground">
                      {t("noGradeRangeBody")}
                    </p>
                  </div>
                )}

                {selected.subjects.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-[var(--edu-radius-card)] border border-dashed border-border bg-card py-12 text-center">
                    <h3 className="text-sm font-bold text-foreground">
                      {t("noSubjects")}
                    </h3>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      {t("noSubjectsSubtitle", { name: selected.name })}
                    </p>
                    {gradeRange && (
                      <Button
                        size="sm"
                        className="mt-1"
                        onClick={() => setCreateSubjectOpen(true)}
                      >
                        <Plus aria-hidden="true" className="size-4" />
                        {t("addFirstSubject")}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[var(--edu-radius-card)] border border-border bg-card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="px-4 py-3 font-semibold text-foreground">
                            {t("colName")}
                          </th>
                          <th className="px-4 py-3 font-semibold text-foreground">
                            {t("colGrade")}
                          </th>
                          <th className="px-4 py-3 font-semibold text-foreground">
                            {t("colCode")}
                          </th>
                          <th className="px-4 py-3 font-semibold text-foreground">
                            {t("colStatus")}
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-foreground">
                            {t("colActions")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.subjects.map((s) => {
                          const archiveBlocked = s.inUse;
                          return (
                            <tr
                              key={s.id}
                              className="border-b border-border last:border-0"
                            >
                              <td className="px-4 py-3">
                                <span className="font-medium text-foreground">
                                  {s.name}
                                </span>
                                {s.inUse && (
                                  <span className="ml-2 text-xs text-edu-success-text">
                                    · {t("inUseLabel")}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-foreground">
                                {t("gradeLabel", { level: s.gradeLevel })}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                {s.code ?? "—"}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge
                                  tone={
                                    s.status === "ACTIVE" ? "success" : "muted"
                                  }
                                >
                                  {s.status === "ACTIVE"
                                    ? t("statusActive")
                                    : t("statusArchived")}
                                </StatusBadge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenDetail(s.id)}
                                  >
                                    {t("viewEditButton")}
                                  </Button>
                                  {s.status === "ACTIVE" &&
                                    (archiveBlocked ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            aria-disabled="true"
                                            aria-label={t("archiveButton")}
                                            onClick={(e) => e.preventDefault()}
                                            className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-[var(--edu-radius-btn)] px-2 text-sm font-medium text-muted-foreground opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                          >
                                            <Archive
                                              aria-hidden="true"
                                              className="size-3.5"
                                            />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {t("archiveBlockedTooltip")}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        aria-label={t("archiveButton")}
                                        className="text-edu-error-text hover:text-edu-error-text"
                                        onClick={() => setArchiveTarget(s)}
                                      >
                                        <Archive
                                          aria-hidden="true"
                                          className="size-3.5"
                                        />
                                      </Button>
                                    ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <CreateParentDialog
        open={createParentOpen}
        onOpenChange={setCreateParentOpen}
        onSubmit={async (data) => {
          const result = await onCreateParent(data);
          if (result.ok) {
            setParents((prev) => [{ ...result.parent, subjects: [] }, ...prev]);
            setSelectedId(result.parent.id);
          }
          return result;
        }}
      />

      {selected && gradeRange && (
        <CreateSubjectDialog
          open={createSubjectOpen}
          onOpenChange={setCreateSubjectOpen}
          parent={selected}
          gradeRange={gradeRange}
          onSubmit={async (data) => {
            const result = await onCreateSubject(data);
            if (result.ok) {
              setParents((prev) =>
                prev.map((p) =>
                  p.id === result.subject.parentId
                    ? { ...p, subjects: [...p.subjects, result.subject] }
                    : p,
                ),
              );
            }
            return result;
          }}
        />
      )}

      <SubjectDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        parentName={selected?.name ?? ""}
        subject={detailSubject}
        classOfferings={detailOfferings}
        loading={sheetLoading}
        onSave={async (id, data) => {
          const result = await onPatchSubject(id, data);
          if (result.ok) {
            setDetailSubject(result.subject);
            updateSubjectInState(result.subject);
          }
          return result;
        }}
      />

      <AlertDialog
        open={archiveTarget !== null}
        onOpenChange={(o) => {
          if (!o) setArchiveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("archiveConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget
                ? t("archiveConfirmBody", { name: archiveTarget.name })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelButton")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-edu-error-text text-white hover:bg-edu-error-text/90"
              onClick={() => archiveTarget && handleArchive(archiveTarget)}
            >
              {t("archiveConfirmButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function Header({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </header>
  );
}
