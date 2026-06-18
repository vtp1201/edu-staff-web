import type { LessonFileType, LessonVisibility } from "./lesson.entity";

export interface UploadLessonInput {
  title: string;
  description?: string;
  subjectId: string;
  department?: string;
  fileType: LessonFileType;
  /**
   * For file types (pdf/pptx/mp4): the File object.
   * For "link": undefined (linkUrl used instead).
   */
  file?: File;
  /** Only for fileType="link". */
  linkUrl?: string;
  visibility: LessonVisibility;
}
