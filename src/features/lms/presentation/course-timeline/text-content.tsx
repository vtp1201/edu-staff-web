import { cn } from "@/shared/utils";
import { toParagraphs } from "./course-timeline.derive";

export interface TextContentProps {
  content: string;
  /** The caller owns the reading area: the player gives the body the whole
   *  pane, where the old fixed `max-h` inner scroller would trap the page's
   *  primary content in a 50vh box. */
  className?: string;
}

/**
 * A lesson body. `content` is PLAIN TEXT on the wire, rendered as paragraphs —
 * no raw HTML, therefore no `dangerouslySetInnerHTML`.
 */
export function TextContent({ content, className }: TextContentProps) {
  const paragraphs = toParagraphs(content);
  return (
    <div className={cn("text-sm leading-relaxed", className)}>
      {paragraphs.map((paragraph) => (
        <p
          key={paragraph.id}
          className="mb-2 text-edu-text-secondary last:mb-0"
        >
          {paragraph.text}
        </p>
      ))}
    </div>
  );
}
