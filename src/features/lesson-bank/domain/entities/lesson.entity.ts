export type LessonFileType = "pdf" | "pptx" | "mp4" | "link";

export type LessonVisibility = "private" | "dept" | "school";

export interface LessonEntity {
  id: string;
  title: string;
  description?: string;
  subjectId: string;
  subjectName: string;
  department?: string;
  fileType: LessonFileType;
  /** File URL or external link. */
  fileUrl: string;
  /** Thumbnail URL — undefined = use fileType placeholder. */
  thumbnailUrl?: string;
  visibility: LessonVisibility;
  /** ISO date string (YYYY-MM-DD). */
  uploadedAt: string;
  authorId: string;
  authorName: string;
  viewCount: number;
}

export interface LessonListFilter {
  subjectId?: string;
  department?: string;
  visibility?: LessonVisibility;
  search?: string;
  sort?: "newest" | "most-viewed" | "title-asc";
}
