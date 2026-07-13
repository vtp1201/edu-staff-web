import type { AttendanceTrendPointEntity } from "@/features/principal/domain/reports/entities/attendance-trend-point.entity";
import type { ReportListItemEntity } from "@/features/principal/domain/reports/entities/report-list-item.entity";
import type { ReportsSummaryEntity } from "@/features/principal/domain/reports/entities/reports-summary.entity";
import type { SubjectAverageEntity } from "@/features/principal/domain/reports/entities/subject-average.entity";

/**
 * FR-009 (Should). Client-side export of the already-rendered term dashboard.
 *
 * Scope decision (see story.md): ships as a CSV file (Excel-openable, UTF-8
 * BOM) rather than a binary `.xlsx`, to avoid pulling in a zip/XML dependency
 * for a Should-priority affordance. A true binary `.xlsx` would need a library
 * + ADR — flagged to fe-lead. The serialization core `buildReportsCsv` is a
 * pure, deterministic function so it is fully unit-testable; the download
 * trigger is a thin browser-only wrapper.
 */
export interface ExportReportsInput {
  termLabel: string;
  summary: ReportsSummaryEntity;
  subjects: SubjectAverageEntity[];
  weeks: AttendanceTrendPointEntity[];
  reports: ReportListItemEntity[];
}

/** Translated labels (resolved at presentation, passed in — i18n boundary). */
export interface ExportReportsLabels {
  title: string;
  statsHeading: string;
  totalStudents: string;
  schoolAverage: string;
  attendanceRate: string;
  incidents: string;
  subjectsHeading: string;
  subjectCol: string;
  averageCol: string;
  attendanceHeading: string;
  weekCol: string;
  rateCol: string;
  reportsHeading: string;
  nameCol: string;
  createdAtCol: string;
  statusCol: string;
  statusReady: string;
  statusGenerating: string;
}

/** RFC-4180 CSV cell escaping. */
function cell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function line(...cells: Array<string | number>): string {
  return cells.map(cell).join(",");
}

/**
 * Pure, deterministic CSV serialization of the dashboard for one term. Throws
 * if required data is missing so a corrupt/partial file is never produced
 * (FR-009 AC-2).
 */
export function buildReportsCsv(
  input: ExportReportsInput,
  labels: ExportReportsLabels,
): string {
  if (!input.summary) {
    throw new Error("export-reports: missing summary data");
  }
  const { summary } = input;
  const lines: string[] = [];

  lines.push(line(`${labels.title} — ${input.termLabel}`));
  lines.push("");

  lines.push(line(labels.statsHeading));
  lines.push(line(labels.totalStudents, summary.totalStudents));
  lines.push(line(labels.schoolAverage, summary.schoolAverage));
  lines.push(line(labels.attendanceRate, summary.attendanceRate));
  lines.push(line(labels.incidents, summary.incidentCount));
  lines.push("");

  lines.push(line(labels.subjectsHeading));
  lines.push(line(labels.subjectCol, labels.averageCol));
  for (const s of input.subjects) {
    lines.push(line(s.subjectName, s.average));
  }
  lines.push("");

  lines.push(line(labels.attendanceHeading));
  lines.push(line(labels.weekCol, labels.rateCol));
  for (const w of input.weeks) {
    lines.push(line(w.weekLabel, w.rate));
  }
  lines.push("");

  lines.push(line(labels.reportsHeading));
  lines.push(line(labels.nameCol, labels.createdAtCol, labels.statusCol));
  for (const r of input.reports) {
    const status =
      r.status === "ready" ? labels.statusReady : labels.statusGenerating;
    lines.push(line(r.name, r.createdAt, status));
  }

  return lines.join("\n");
}

/** Build the downloadable Blob (UTF-8 BOM → Excel reads Vietnamese correctly). */
export function buildReportsBlob(
  input: ExportReportsInput,
  labels: ExportReportsLabels,
): Blob {
  const csv = buildReportsCsv(input, labels);
  return new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
}

/** Thin browser-only download trigger. Returns the filename used. */
export function downloadReportsCsv(
  input: ExportReportsInput,
  labels: ExportReportsLabels,
  termId: string,
): string {
  const blob = buildReportsBlob(input, labels);
  const filename = `bao-cao-${termId.toLowerCase()}.csv`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return filename;
}
