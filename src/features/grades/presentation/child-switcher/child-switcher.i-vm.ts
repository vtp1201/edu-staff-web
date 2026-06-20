import type { ChildSummary } from "../../domain/entities/grade-book.entity";

export interface ChildSwitcherVM {
  childList: ChildSummary[];
  activeChildId: string;
}
