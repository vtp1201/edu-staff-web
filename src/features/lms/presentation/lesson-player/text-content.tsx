import type { LessonTextBlock } from "@/features/lms/domain/entities/lesson.entity";

export interface TextContentProps {
  blocks: LessonTextBlock[];
}

/**
 * Text lesson: structured heading/paragraph blocks (no raw HTML → no
 * dangerouslySetInnerHTML). Scrolls within its container.
 */
export function TextContent({ blocks }: TextContentProps) {
  return (
    <div className="max-h-[60vh] overflow-y-auto px-7 py-6 text-foreground text-sm leading-relaxed">
      {blocks.map((block) => (
        <section key={block.heading} className="mb-3 last:mb-0">
          <h2 className="mb-2 font-extrabold text-[15px]">{block.heading}</h2>
          {block.paragraphs.map((p) => (
            <p key={p} className="mb-1.5 text-edu-text-secondary last:mb-0">
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
