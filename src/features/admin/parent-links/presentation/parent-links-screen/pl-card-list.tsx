import { PLCard } from "./pl-card";
import type { PLRowsProps } from "./pl-rows.i-vm";

/** Mobile card list (<760px). Consumes the SAME `PLRowsProps` as PLTable. */
export function PLCardList({
  rows,
  labels,
  onViewDetail,
  onUnlinkRequest,
}: PLRowsProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      {rows.map((row) => (
        <PLCard
          key={row.linkId}
          row={row}
          labels={labels}
          onViewDetail={onViewDetail}
          onUnlinkRequest={onUnlinkRequest}
        />
      ))}
    </div>
  );
}
