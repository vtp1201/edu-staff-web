"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  Info,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AcademicYear } from "../../domain/entities/academic-year.entity";
import type { Term } from "../../domain/entities/term.entity";
import type {
  CalendarActions,
  CalendarErrorKey,
  CalendarScreenVM,
} from "./calendar-screen.i-vm";
import { DateField, formatDisplayDate } from "./date-field";

interface EditingState {
  yearId: string;
  termId: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface DeleteTarget {
  yearId: string;
  term: Term;
}

interface CalendarScreenProps {
  initialData: CalendarScreenVM;
  actions: CalendarActions;
}

export function CalendarScreen({ initialData, actions }: CalendarScreenProps) {
  const t = useTranslations("calendar");
  const tErrors = useTranslations("calendar.errors");

  const [years, setYears] = useState<AcademicYear[]>(initialData.years);
  const [expandedYearId, setExpandedYearId] = useState<string | null>(
    initialData.years[0]?.id ?? null,
  );
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [errorKey, setErrorKey] = useState<CalendarErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const editInputRef = useRef<HTMLInputElement>(null);

  const isEmpty = years.length === 0;
  const editingTermId = editing?.termId ?? null;

  // Move focus to the term name input when an edit session begins so
  // keyboard users land directly on the first editable field. Depend only
  // on the term id so re-renders from typing don't steal focus.
  useEffect(() => {
    if (editingTermId) {
      editInputRef.current?.focus();
    }
  }, [editingTermId]);

  const toggleExpand = (id: string) =>
    setExpandedYearId((curr) => (curr === id ? null : id));

  const startEdit = (yearId: string, term: Term) => {
    setErrorKey(null);
    setEditing({
      yearId,
      termId: term.id,
      name: term.name,
      startDate: term.startDate,
      endDate: term.endDate,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setErrorKey(null);
  };

  const saveEdit = () => {
    if (!editing) return;
    setErrorKey(null);
    const draft = editing;
    startTransition(async () => {
      const res = await actions.updateTermAction(
        draft.yearId,
        draft.termId,
        draft.name,
        draft.startDate,
        draft.endDate,
      );
      if (!res.ok) {
        setErrorKey(res.errorKey);
        return;
      }
      setYears((ys) =>
        ys.map((y) =>
          y.id !== draft.yearId
            ? y
            : {
                ...y,
                terms: y.terms.map((tm) =>
                  tm.id !== draft.termId ? tm : res.term,
                ),
              },
        ),
      );
      setEditing(null);
    });
  };

  const addTerm = (year: AcademicYear) => {
    setErrorKey(null);
    const name = t("term.defaultName", { n: year.terms.length + 1 });
    startTransition(async () => {
      // Sensible default span so the date-order rule passes; admin can edit.
      const start = `${new Date().getFullYear()}-09-05`;
      const end = `${new Date().getFullYear() + 1}-01-15`;
      const res = await actions.createTermAction(year.id, name, start, end);
      if (!res.ok) {
        setErrorKey(res.errorKey);
        return;
      }
      setYears((ys) =>
        ys.map((y) =>
          y.id !== year.id ? y : { ...y, terms: [...y.terms, res.term] },
        ),
      );
      startEdit(year.id, res.term);
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { yearId, term } = deleteTarget;
    startTransition(async () => {
      const res = await actions.deleteTermAction(
        yearId,
        term.id,
        term.hasGrades,
      );
      if (!res.ok) {
        setErrorKey(res.errorKey);
        setDeleteTarget(null);
        return;
      }
      setYears((ys) =>
        ys.map((y) =>
          y.id !== yearId
            ? y
            : { ...y, terms: y.terms.filter((tm) => tm.id !== term.id) },
        ),
      );
      setDeleteTarget(null);
    });
  };

  const createYear = () => {
    const label = newLabel.trim();
    if (!label) return;
    setErrorKey(null);
    startTransition(async () => {
      const res = await actions.createYearAction(label, newActive);
      if (!res.ok) {
        setErrorKey(res.errorKey);
        return;
      }
      setYears((ys) => {
        const updated = newActive
          ? ys.map((y) => ({ ...y, isActive: false }))
          : ys;
        return [res.year, ...updated];
      });
      setExpandedYearId(res.year.id);
      setNewLabel("");
      setNewActive(true);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto max-w-[1200px]">
        {/* Page title */}
        <div className="mb-6 flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-edu-primary/[0.12]">
            <CalendarDays
              className="size-[22px] text-edu-primary"
              aria-hidden="true"
            />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">
              {t("title")}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {errorKey && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-edu-error/40 bg-edu-error/10 px-4 py-2.5 text-sm font-medium text-foreground"
          >
            {tErrors(errorKey)}
          </p>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[3fr_2fr]">
          {/* LEFT — years list */}
          <div className="flex flex-col gap-3.5">
            {isEmpty ? (
              <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-edu-primary/[0.08]">
                  <CalendarDays
                    className="size-[30px] text-edu-primary"
                    aria-hidden="true"
                  />
                </div>
                <p className="mb-1.5 text-base font-extrabold text-foreground">
                  {t("empty.title")}
                </p>
                <p className="mx-auto mb-5 max-w-[360px] text-sm leading-relaxed text-muted-foreground">
                  {t("empty.subtitle")}
                </p>
                <Button
                  type="button"
                  onClick={() =>
                    document.getElementById("cal-new-year-input")?.focus()
                  }
                >
                  <Plus className="size-4" aria-hidden="true" />
                  {t("empty.cta")}
                </Button>
              </div>
            ) : (
              years.map((year) => {
                const isExpanded = expandedYearId === year.id;
                const panelId = `cal-year-panel-${year.id}`;
                return (
                  <div key={year.id} className={cnBorder(year.isActive)}>
                    {/* Card header */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(year.id)}
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      className={`flex w-full items-center gap-3.5 px-5 py-4 text-left ${
                        year.isActive ? "bg-edu-success/[0.04]" : ""
                      }`}
                    >
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] ${
                          year.isActive ? "bg-edu-success/[0.13]" : "bg-muted"
                        }`}
                      >
                        <CalendarDays
                          className={`size-[18px] ${
                            year.isActive
                              ? "text-edu-success"
                              : "text-muted-foreground"
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2.5">
                          <span className="text-base font-extrabold tabular-nums text-foreground">
                            {year.label}
                          </span>
                          {year.isActive && (
                            <Badge className="gap-1.5 border-transparent bg-edu-success/[0.18] text-edu-text-primary">
                              <span className="size-1.5 rounded-full bg-edu-success" />
                              {t("year.active")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {year.terms.length === 0
                            ? t("year.noTerms")
                            : t("year.termCount", {
                                count: year.terms.length,
                              })}
                        </p>
                      </div>
                      <ChevronDown
                        className={`size-5 shrink-0 text-muted-foreground transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    {/* Expanded body */}
                    {isExpanded && (
                      <div id={panelId} className="border-t border-border">
                        {/* Table header */}
                        <div className="grid grid-cols-[1.6fr_1fr_1fr_96px] gap-2 bg-muted px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-edu-text-secondary">
                          <div>{t("term.name")}</div>
                          <div>{t("term.startDate")}</div>
                          <div>{t("term.endDate")}</div>
                          <div className="text-right">{t("term.actions")}</div>
                        </div>

                        {year.terms.length === 0 ? (
                          <p className="px-5 py-7 text-center text-sm text-muted-foreground">
                            {t("term.noTerms")}
                          </p>
                        ) : (
                          year.terms.map((term) => {
                            const isEditing =
                              editing?.yearId === year.id &&
                              editing?.termId === term.id;
                            return (
                              <div
                                key={term.id}
                                className="grid grid-cols-[1.6fr_1fr_1fr_96px] items-center gap-2 border-t border-border px-5 py-3"
                              >
                                {isEditing && editing ? (
                                  <>
                                    <Input
                                      ref={editInputRef}
                                      value={editing.name}
                                      aria-label={t("term.name")}
                                      onChange={(e) =>
                                        setEditing({
                                          ...editing,
                                          name: e.target.value,
                                        })
                                      }
                                      className="h-9"
                                    />
                                    <DateField
                                      value={editing.startDate}
                                      ariaLabel={t("term.startDate")}
                                      placeholder={t("term.startDate")}
                                      onChange={(iso) =>
                                        setEditing({
                                          ...editing,
                                          startDate: iso,
                                        })
                                      }
                                    />
                                    <DateField
                                      value={editing.endDate}
                                      ariaLabel={t("term.endDate")}
                                      placeholder={t("term.endDate")}
                                      min={editing.startDate}
                                      onChange={(iso) =>
                                        setEditing({
                                          ...editing,
                                          endDate: iso,
                                        })
                                      }
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label={t("term.cancel")}
                                        onClick={cancelEdit}
                                        disabled={isPending}
                                        className="size-11"
                                      >
                                        <X
                                          className="size-3.5"
                                          aria-hidden="true"
                                        />
                                      </Button>
                                      <Button
                                        type="button"
                                        size="icon"
                                        aria-label={t("term.save")}
                                        onClick={saveEdit}
                                        disabled={isPending}
                                        className="size-11"
                                      >
                                        <Check
                                          className="size-3.5"
                                          aria-hidden="true"
                                        />
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex min-w-0 items-center gap-2">
                                      <span className="truncate text-sm font-bold text-foreground">
                                        {term.name}
                                      </span>
                                      {term.hasGrades && (
                                        <span className="shrink-0 rounded border border-edu-warning/30 bg-edu-warning-light px-1.5 py-px text-[10px] font-bold text-edu-warning-foreground">
                                          {t("term.graded")}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm tabular-nums text-edu-text-secondary">
                                      {formatDisplayDate(term.startDate)}
                                    </div>
                                    <div className="text-sm tabular-nums text-edu-text-secondary">
                                      {formatDisplayDate(term.endDate)}
                                    </div>
                                    <div className="flex justify-end gap-1.5">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label={t("term.edit")}
                                        onClick={() => startEdit(year.id, term)}
                                        className="size-11"
                                      >
                                        <Pencil
                                          className="size-3.5"
                                          aria-hidden="true"
                                        />
                                      </Button>
                                      {term.hasGrades ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="icon"
                                              aria-label={t(
                                                "term.deleteBlocked",
                                              )}
                                              aria-disabled="true"
                                              onClick={(e) =>
                                                e.preventDefault()
                                              }
                                              className="size-11 cursor-not-allowed opacity-55"
                                            >
                                              <X
                                                className="size-3.5"
                                                aria-hidden="true"
                                              />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {t("term.deleteBlocked")}
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          aria-label={t("term.delete")}
                                          onClick={() =>
                                            setDeleteTarget({
                                              yearId: year.id,
                                              term,
                                            })
                                          }
                                          className="size-11 border-edu-error/40 text-edu-error hover:bg-edu-error/10 hover:text-edu-error"
                                        >
                                          <X
                                            className="size-3.5"
                                            aria-hidden="true"
                                          />
                                        </Button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })
                        )}

                        {/* Add term footer */}
                        <div className="border-t border-border px-3.5 py-2.5">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => addTerm(year)}
                            disabled={isPending}
                            className="h-9 text-edu-primary hover:bg-edu-primary/[0.12] hover:text-edu-primary"
                          >
                            <Plus className="size-3.5" aria-hidden="true" />
                            {t("term.addTerm")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT — new year form */}
          <div className="flex flex-col gap-3.5 lg:sticky lg:top-0">
            <div className="rounded-2xl border border-border bg-card p-[22px] shadow-card">
              <div className="mb-1 flex items-center gap-2.5">
                <Plus className="size-4 text-edu-primary" aria-hidden="true" />
                <h2 className="text-[15px] font-extrabold text-foreground">
                  {t("addYear.title")}
                </h2>
              </div>
              <p className="mb-[18px] text-xs leading-relaxed text-muted-foreground">
                {t("addYear.subtitle")}
              </p>

              <Label
                htmlFor="cal-new-year-input"
                className="mb-1.5 block text-xs font-bold text-muted-foreground"
              >
                {t("addYear.label")}
              </Label>
              <Input
                id="cal-new-year-input"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createYear();
                }}
                placeholder={t("addYear.placeholder")}
              />

              <div className="mt-4 flex items-start gap-3 rounded-[10px] border border-border bg-muted px-3.5 py-3">
                <Switch
                  id="cal-set-active"
                  checked={newActive}
                  onCheckedChange={setNewActive}
                  aria-label={t("addYear.setActive")}
                  className="mt-0.5 data-[state=checked]:bg-edu-success"
                />
                <Label
                  htmlFor="cal-set-active"
                  className="flex-1 cursor-pointer text-sm font-bold text-foreground"
                >
                  {t("addYear.setActive")}
                </Label>
              </div>

              <Button
                type="button"
                onClick={createYear}
                disabled={!newLabel.trim() || isPending}
                className="mt-4 w-full"
              >
                <Plus className="size-4" aria-hidden="true" />
                {isPending ? t("addYear.submitting") : t("addYear.submit")}
              </Button>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-edu-primary/25 bg-edu-primary/[0.04] px-4 py-3.5">
              <Info
                className="mt-0.5 size-4 shrink-0 text-edu-primary"
                aria-hidden="true"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("addYear.subtitle")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("term.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.term.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("term.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-edu-error text-edu-error-foreground hover:bg-edu-error/90"
            >
              {t("term.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function cnBorder(isActive: boolean): string {
  return `overflow-hidden rounded-2xl border bg-card shadow-card ${
    isActive ? "border-edu-success/[0.35]" : "border-border"
  }`;
}
