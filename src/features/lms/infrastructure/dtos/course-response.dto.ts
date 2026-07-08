/** Wire shape of one enrolled course (camelCase per api-integration.md). */
export interface CourseDto {
  id: string;
  name: string;
  teacherName: string;
  /** Raw accent color (hex) — mapped to a semantic tone by the mapper. */
  color: string;
  lessonsDone: number;
  lessonsTotal: number;
  grade: number | null;
}

export interface CoursesListDto {
  courses: CourseDto[];
}
