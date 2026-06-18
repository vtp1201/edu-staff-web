"use client";

type Band = { label: string; count: number };

/** Token tones per performance band (highest → lowest). */
const TONE: Record<string, string> = {
  Giỏi: "bg-edu-success",
  Khá: "bg-edu-primary",
  "Trung bình": "bg-edu-warning",
  Yếu: "bg-edu-error",
  Kém: "bg-edu-error-dark",
};

export function GradeDistributionChart({
  distribution,
}: {
  distribution: Band[];
}) {
  const max = Math.max(1, ...distribution.map((b) => b.count));
  return (
    <ul className="flex flex-col gap-2">
      {distribution.map((band) => (
        <li key={band.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-muted-foreground">
            {band.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-edu-border">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${TONE[band.label] ?? "bg-muted"}`}
              style={{ width: `${(band.count / max) * 100}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs font-semibold text-foreground">
            {band.count}
          </span>
        </li>
      ))}
    </ul>
  );
}
