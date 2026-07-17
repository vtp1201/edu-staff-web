import type { QuestionEntity } from "../../domain/entities/question.entity";
import type { QuestionResponseDto } from "../dtos/question-response.dto";

/**
 * DTO → entity. 1:1 field map (wire is already camelCase). `expectedAnswer` is
 * normalized to `null` when the wire omits the key or sends `""`/`null`
 * ("no reference answer"), never coerced to `""`. `publishedAt` stays
 * `undefined` when the wire omits the key (DRAFT). `tags` is defended to `[]`.
 */
export function mapQuestion(dto: QuestionResponseDto): QuestionEntity {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    authorId: dto.authorId,
    questionType: dto.questionType,
    subjectId: dto.subjectId,
    gradeLevel: dto.gradeLevel,
    difficulty: dto.difficulty,
    body: dto.body,
    // Absent / null / "" → null (no reference answer).
    expectedAnswer: dto.expectedAnswer ? dto.expectedAnswer : null,
    status: dto.status,
    tags: dto.tags ?? [],
    // Key-absence → undefined (never a false "published as empty string").
    publishedAt: dto.publishedAt ? dto.publishedAt : undefined,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
