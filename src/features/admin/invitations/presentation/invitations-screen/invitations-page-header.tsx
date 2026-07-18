import { RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface InvitationsPageHeaderProps {
  title: string;
  subtitle: string;
  refreshLabel: string;
  sendLabel: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenSendDialog: () => void;
}

export function InvitationsPageHeader({
  title,
  subtitle,
  refreshLabel,
  sendLabel,
  isRefreshing,
  onRefresh,
  onOpenSendDialog,
}: InvitationsPageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <div className="min-w-56 flex-1">
        <h1 className="font-extrabold text-2xl text-foreground">{title}</h1>
        <p className="mt-1 text-muted-foreground text-sm">{subtitle}</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={onRefresh}
        aria-busy={isRefreshing}
        disabled={isRefreshing}
      >
        <RefreshCw
          className={isRefreshing ? "size-4 animate-spin" : "size-4"}
          aria-hidden="true"
        />
        {refreshLabel}
      </Button>
      <Button type="button" onClick={onOpenSendDialog}>
        <Send className="size-4" aria-hidden="true" />
        {sendLabel}
      </Button>
    </div>
  );
}
