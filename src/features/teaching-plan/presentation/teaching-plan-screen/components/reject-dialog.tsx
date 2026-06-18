"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MIN_REASON_LENGTH = 10;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: (reason: string) => void;
};

export function RejectDialog({
  open,
  onOpenChange,
  isPending,
  onConfirm,
}: Props) {
  const t = useTranslations("teachingPlan.reject");
  const reasonId = useId();
  const errId = useId();
  const [reason, setReason] = useState("");
  const [showError, setShowError] = useState(false);

  const invalid = reason.trim().length < MIN_REASON_LENGTH;

  const handleConfirm = () => {
    if (invalid) {
      setShowError(true);
      return;
    }
    onConfirm(reason);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setReason("");
      setShowError(false);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={reasonId}>{t("reasonLabel")}</Label>
          <Textarea
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("reasonPlaceholder")}
            rows={4}
            aria-invalid={showError && invalid}
            aria-describedby={showError && invalid ? errId : undefined}
          />
          {showError && invalid ? (
            <p id={errId} className="text-edu-error-text text-xs">
              {t("reasonMinLength")}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
