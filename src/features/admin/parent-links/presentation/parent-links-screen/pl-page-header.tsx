import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PLPageHeaderProps {
  title: string;
  subtitle: string;
  createLabel: string;
  onOpenCreateDialog: () => void;
}

/** Page header: title + subtitle + "Tạo liên kết" primary button. */
export function PLPageHeader({
  title,
  subtitle,
  createLabel,
  onOpenCreateDialog,
}: PLPageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <div className="min-w-55 flex-1">
        <h1 className="font-extrabold text-2xl text-foreground">{title}</h1>
        <p className="mt-1 text-muted-foreground text-sm">{subtitle}</p>
      </div>
      <Button type="button" onClick={onOpenCreateDialog}>
        <Plus className="size-4" aria-hidden="true" />
        {createLabel}
      </Button>
    </div>
  );
}
