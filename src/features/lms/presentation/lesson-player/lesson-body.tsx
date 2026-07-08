import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { CourseTone } from "@/features/lms/domain/entities/course.entity";
import type { ActiveLessonVm } from "./lesson-player.i-vm";
import { PdfPreview } from "./pdf-preview";
import { TextContent } from "./text-content";
import { VideoPlayer } from "./video-player";

export interface LessonBodyProps {
  lesson: ActiveLessonVm;
  tone: CourseTone;
  labels: {
    emptyTitle: string;
    emptyBody: string;
    video: {
      lectureLabel: string;
      playAriaLabel: string;
      pauseAriaLabel: string;
      seekAriaLabel: string;
      playingAnnounce: string;
      pausedAnnounce: string;
    };
    pdf: { downloadButton: string; downloadAriaLabel: string; title: string };
  };
}

/** Discriminated-union switch on lesson.type. `null` → empty state. */
export function LessonBody({ lesson, tone, labels }: LessonBodyProps) {
  if (lesson === null) {
    return (
      <EmptyState
        icon={BookOpen}
        title={labels.emptyTitle}
        body={labels.emptyBody}
      />
    );
  }

  switch (lesson.type) {
    case "video":
      return (
        <VideoPlayer
          title={lesson.title}
          durationLabel={lesson.durationLabel}
          tone={tone}
          labels={labels.video}
        />
      );
    case "pdf":
      return (
        <PdfPreview
          title={labels.pdf.title}
          pageCountLabel={lesson.durationLabel}
          downloadHref={lesson.downloadHref}
          labels={{
            downloadButton: labels.pdf.downloadButton,
            downloadAriaLabel: labels.pdf.downloadAriaLabel,
          }}
        />
      );
    case "text":
      return <TextContent blocks={lesson.blocks} />;
  }
}
