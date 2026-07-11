export type DepartmentStatus = "ACTIVE" | "ARCHIVED";

/** Platform-suggested concept label (BE enum); the custom label overrides it. */
export type DepartmentConceptLabel = "BO_MON" | "TO" | "KHOA";

export interface Department {
  id: string;
  name: string;
  /** Platform hint for the UI label (nullable). */
  conceptLabelSuggested: DepartmentConceptLabel | null;
  /** Free-text override; takes precedence over the suggested hint (nullable). */
  conceptLabelCustom: string | null;
  subjectParentIds: string[];
  status: DepartmentStatus;
  activeAssignmentCount: number;
}

/** Effective label to display: custom wins over suggested, else null. */
export function effectiveConceptLabel(dep: {
  conceptLabelSuggested: DepartmentConceptLabel | null;
  conceptLabelCustom: string | null;
}): string | null {
  return dep.conceptLabelCustom ?? dep.conceptLabelSuggested ?? null;
}

export interface CreateDepartmentInput {
  name: string;
  conceptLabelSuggested: DepartmentConceptLabel | null;
  conceptLabelCustom: string | null;
  subjectParentIds: string[];
}

export type PatchDepartmentInput = Partial<CreateDepartmentInput>;
