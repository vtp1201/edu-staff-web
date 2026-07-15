import { cn } from "@/shared/utils";
import type { FeedAttachment } from "../../../domain/entities/feed-post.entity";

export interface FeedImageGridProps {
  images: FeedAttachment[];
}

/** Placeholder image tile — striped surface + monospace caption + real alt. */
function FeedImg({
  image,
  className,
}: {
  image: FeedAttachment;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={image.alt}
      title={image.alt}
      className={cn(
        "flex min-w-0 items-center justify-center overflow-hidden rounded-[10px] border border-border",
        "bg-[repeating-linear-gradient(45deg,var(--edu-bg),var(--edu-bg)_10px,var(--edu-card)_10px,var(--edu-card)_20px)]",
        className,
      )}
    >
      <span className="whitespace-nowrap rounded-md border border-border bg-card px-2 py-[3px] font-mono text-[11px] text-edu-text-secondary">
        {image.label}
      </span>
    </div>
  );
}

/**
 * Attachment grid — layout is a pure function of `images.length` (1/2/3/4+),
 * per design-spec `FeedImageGrid`. Renders nothing when empty.
 */
export function FeedImageGrid({ images }: FeedImageGridProps) {
  if (images.length === 0) return null;

  if (images.length === 1) {
    return <FeedImg image={images[0]} className="mt-3 aspect-video" />;
  }
  if (images.length === 2) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {images.map((im) => (
          <FeedImg key={im.label} image={im} className="aspect-[4/3]" />
        ))}
      </div>
    );
  }
  if (images.length === 3) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <FeedImg image={images[0]} className="col-span-2 aspect-[21/9]" />
        <FeedImg image={images[1]} className="aspect-[4/3]" />
        <FeedImg image={images[2]} className="aspect-[4/3]" />
      </div>
    );
  }
  return (
    <div className="mt-3 grid grid-cols-2 gap-1.5">
      {images.slice(0, 4).map((im) => (
        <FeedImg key={im.label} image={im} className="aspect-[4/3]" />
      ))}
    </div>
  );
}
