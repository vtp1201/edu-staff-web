import type { CourseItem } from "../entities/course-item.entity";
import type {
  CreateDocumentItemInput,
  ILmsRepository,
} from "../repositories/i-lms.repository";
import { type Result, runCatching } from "./result";

/** Create the one item kind a client authors directly. `url` must be an
 *  absolute `https://` URL with a host — BE's allowlist is the authority, the
 *  client pre-check (`isHttpsUrl`) only saves a round trip. */
export class AddDocumentItemUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(
    courseId: string,
    input: CreateDocumentItemInput,
  ): Promise<Result<CourseItem>> {
    return runCatching(() => this.repo.addDocumentItem(courseId, input));
  }
}
