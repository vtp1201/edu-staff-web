import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CourseTone } from "@/features/lms/domain/entities/course.entity";
import { cn } from "@/shared/utils";
import { TONE_BG, TONE_TEXT } from "../tone";

export interface ProgressCardProps {
  pct: number;
  tone: CourseTone;
  isComplete: boolean;
  label: string;
  /** Pre-formatted "{done}/{total} bài · {pct}%". */
  countLabel: string;
}

/** Course progress summary card in the player's right pane. */
export function ProgressCard({
  pct,
  tone,
  isComplete,
  label,
  countLabel,
}: ProgressCardProps) {
  // Completed → success tone (design-system score rule); else the course tone.
  const valueTone = isComplete ? "success" : tone;
  return (
    <Card className="p-4 shadow-card">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-extrabold text-[10.5px] text-edu-text-secondary uppercase tracking-wider">
          {label}
        </span>
        <span
          className={cn(
            "font-extrabold text-xs tabular-nums",
            TONE_TEXT[valueTone],
          )}
        >
          {countLabel}
        </span>
      </div>
      <Progress
        value={pct}
        indicatorClassName={TONE_BG[valueTone]}
        aria-label={countLabel}
      />
    </Card>
  );
}
