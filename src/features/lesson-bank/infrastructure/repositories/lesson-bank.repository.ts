import "server-only";
import type { AxiosInstance } from "axios";
import { LESSON_BANK_EP } from "@/bootstrap/endpoint/lesson-bank.endpoint";
import type {
  LessonEntity,
  LessonListFilter,
} from "../../domain/entities/lesson.entity";
import type { UploadLessonInput } from "../../domain/entities/upload-lesson-input.entity";
import type { ILessonBankRepository } from "../../domain/repositories/i-lesson-bank.repository";
import type {
  LessonListResponseDto,
  LessonResponseDto,
} from "../dtos/lesson-response.dto";
import { mapLesson, mapLessonList } from "../mappers/lesson.mapper";

export class LessonBankRepository implements ILessonBankRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listLessons(filter: LessonListFilter): Promise<LessonEntity[]> {
    const dto = (await this.http.get(LESSON_BANK_EP.list, {
      params: {
        subjectId: filter.subjectId,
        department: filter.department,
        visibility: filter.visibility,
        search: filter.search,
        sort: filter.sort,
      },
    })) as unknown as LessonListResponseDto;
    return mapLessonList(dto);
  }

  async getLessonDetail(id: string): Promise<LessonEntity> {
    const dto = (await this.http.get(
      LESSON_BANK_EP.detail(id),
    )) as unknown as LessonResponseDto;
    return mapLesson(dto);
  }

  async uploadLesson(input: UploadLessonInput): Promise<LessonEntity> {
    // File upload is a placeholder — send as JSON for mock-first phase.
    const body = {
      title: input.title,
      description: input.description,
      subjectId: input.subjectId,
      department: input.department,
      fileType: input.fileType,
      linkUrl: input.linkUrl,
      visibility: input.visibility,
      // Filename for non-link types (real upload handled by BE multipart later).
      fileName: input.file?.name,
    };
    const dto = (await this.http.post(
      LESSON_BANK_EP.upload,
      body,
    )) as unknown as LessonResponseDto;
    return mapLesson(dto);
  }

  async updateLesson(
    id: string,
    input: Partial<UploadLessonInput>,
  ): Promise<LessonEntity> {
    const body = {
      title: input.title,
      description: input.description,
      subjectId: input.subjectId,
      department: input.department,
      fileType: input.fileType,
      linkUrl: input.linkUrl,
      visibility: input.visibility,
    };
    const dto = (await this.http.put(
      LESSON_BANK_EP.update(id),
      body,
    )) as unknown as LessonResponseDto;
    return mapLesson(dto);
  }

  async deleteLesson(id: string): Promise<void> {
    await this.http.delete(LESSON_BANK_EP.delete(id));
  }
}
