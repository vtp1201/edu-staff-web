export type ConceptType = "BO_MON" | "TO" | "KHOA" | null;
export type ConceptMode = "BO_MON" | "TO" | "KHOA" | "CUSTOM" | "NONE";
export type ParentStatus = "ACTIVE" | "ARCHIVED";

export interface SubjectParent {
  id: string;
  name: string;
  conceptType: ConceptType;
  conceptLabelCustom: string | null;
  status: ParentStatus;
  childCount: number;
  activeChildCount: number;
}

export interface CreateParentInput {
  name: string;
  conceptType: ConceptType;
  conceptLabelCustom: string | null;
}

export type PatchParentInput = Partial<CreateParentInput>;
