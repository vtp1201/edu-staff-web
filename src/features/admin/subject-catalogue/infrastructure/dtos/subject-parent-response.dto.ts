import type {
  ConceptType,
  ParentStatus,
} from "../../domain/entities/subject-parent.entity";

export interface SubjectParentResponseDto {
  id: string;
  name: string;
  conceptType: ConceptType;
  conceptLabelCustom: string | null;
  status: ParentStatus;
  childCount: number;
  activeChildCount: number;
}
