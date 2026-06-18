import type { StatusTone } from "@/components/shared/status-badge";
import type { LessonFileType } from "../../domain/entities/lesson.entity";

export function fileTypeTone(fileType: LessonFileType): StatusTone {
  switch (fileType) {
    case "pdf":
      return "error";
    case "pptx":
      return "warning";
    case "mp4":
      return "info";
    case "link":
      return "primary";
    default:
      return "muted";
  }
}

export function fileTypeLabel(fileType: LessonFileType): string {
  switch (fileType) {
    case "pdf":
      return "PDF";
    case "pptx":
      return "PPTX";
    case "mp4":
      return "Video";
    case "link":
      return "Link";
    default:
      return fileType;
  }
}
