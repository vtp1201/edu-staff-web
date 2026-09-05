import { toParagraphs } from "./course-timeline.derive";

export interface TextContentProps {
  content: string;
}

/**
 * A lesson body. `content` is PLAIN TEXT on the wire, rendered as paragraphs —
 * no raw HTML, therefore no `dangerouslySetInnerHTML`.
 */
export function TextContent({ content }: TextContentProps) {
  const paragraphs = toParagraphs(content);
  return (
    <div className="max-h-[50vh] overflow-y-auto text-sm leading-relaxed">
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
