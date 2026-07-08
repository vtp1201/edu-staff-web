import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MarkCompleteButtonProps {
  lessonId: string;
  done: boolean;
  isPending: boolean;
  onMarkComplete: (lessonId: string) => void;
  labels: { button: string; doneLabel: string };
}

/** "Đánh dấu hoàn thành" — disabled once the lesson is done (AC-11). */
export function MarkCompleteButton({
  lessonId,
  done,
  isPending,
  onMarkComplete,
  labels,
}: MarkCompleteButtonProps) {
  return (
    <Button
      type="button"
      variant={done ? "secondary" : "default"}
      disabled={done || isPending}
      aria-disabled={done || isPending}
      onClick={() => onMarkComplete(lessonId)}
    >
      {isPending ? (
        <Loader2
          className="size-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
      ) : (
        <Check className="size-4" strokeWidth={2.4} aria-hidden="true" />
      )}
      {done ? labels.doneLabel : labels.button}
    </Button>
  );
}
