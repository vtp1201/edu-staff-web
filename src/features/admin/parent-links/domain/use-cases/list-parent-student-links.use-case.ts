import type { ParentStudentLinkFailure } from "../failures/parent-student-link.failure";
import type {
  IParentStudentLinkRepository,
  ListLinksFilter,
  ListLinksPage,
} from "../repositories/i-parent-student-link.repository";
import type { Result } from "./result";

/** List parent-student links for the admin's tenant (US-E20.1, INT-001). */
export class ListParentStudentLinksUseCase {
  constructor(private readonly repo: IParentStudentLinkRepository) {}

  execute(
    filter: ListLinksFilter,
  ): Promise<Result<ListLinksPage, ParentStudentLinkFailure>> {
    return this.repo.listLinks(filter);
  }
}
