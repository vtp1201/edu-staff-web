import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

/** "Chỉ xem" pill. The lock icon is decorative (aria-hidden) — text carries meaning. */
export function ReadOnlyBadge() {
  const t = useTranslations("timetableView");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-edu-bg px-2.5 py-1.5 font-bold text-[11px] text-edu-text-secondary uppercase tracking-wide">
      <Lock className="size-3" aria-hidden="true" />
      {t("readOnlyBadge")}
    </span>
  );
}
