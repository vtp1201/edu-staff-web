import "server-only";

import type { AxiosInstance } from "axios";
import { LMS_EP } from "@/bootstrap/endpoint/lms.endpoint";
import type { CourseSummary } from "../../domain/entities/course.entity";
import type { LessonNoteEntity } from "../../domain/entities/lesson-note.entity";
import type { LessonQuestionEntity } from "../../domain/entities/lesson-question.entity";
import type {
  CourseLessonsData,
  ILmsRepository,
  MarkCompleteData,
} from "../../domain/repositories/i-lms.repository";
import type { CourseLessonsDto } from "../dtos/course-lessons-response.dto";
import type { CoursesListDto } from "../dtos/course-response.dto";
import { mapCourseLessons, mapCourseSummary } from "../mappers/lms.mapper";

/**
 * Real HTTP implementation — wiring-ready against the documented `lms` endpoints.
 * The `lms` service is not shipped yet (decision 0014); while
 * NEXT_PUBLIC_USE_MOCK=true the DI factory selects `MockLmsRepository` instead,
 * so this is not exercised at runtime today. Kept for contract-readiness.
 * The HTTP interceptor unwraps the envelope → repos receive the payload directly.
 */
export class LmsRepository implements ILmsRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listCourses(studentId: string): Promise<CourseSummary[]> {
    const data = (await this.http.get(LMS_EP.courses(), {
      params: { studentId },
    })) as unknown as CoursesListDto;
    return data.courses.map(mapCourseSummary);
  }

  async getCourseLessons(courseId: string): Promise<CourseLessonsData> {
    const data = (await this.http.get(
      LMS_EP.courseLessons(courseId),
    )) as unknown as CourseLessonsDto;
    return mapCourseLessons(data);
  }

  async markLessonComplete(lessonId: string): Promise<MarkCompleteData> {
    return (await this.http.put(
      LMS_EP.completeLesson(lessonId),
    )) as unknown as MarkCompleteData;
  }

  async getNote(lessonId: string): Promise<LessonNoteEntity | null> {
    return (await this.http.get(
      LMS_EP.note(lessonId),
    )) as unknown as LessonNoteEntity | null;
  }

  async saveNote(lessonId: string, content: string): Promise<LessonNoteEntity> {
    return (await this.http.put(LMS_EP.note(lessonId), {
      content,
    })) as unknown as LessonNoteEntity;
  }

  async listQuestions(lessonId: string): Promise<LessonQuestionEntity[]> {
    return (await this.http.get(
      LMS_EP.questions(lessonId),
    )) as unknown as LessonQuestionEntity[];
  }

  async askQuestion(
    lessonId: string,
    question: string,
  ): Promise<LessonQuestionEntity> {
    return (await this.http.post(LMS_EP.questions(lessonId), {
      question,
    })) as unknown as LessonQuestionEntity;
  }
}
