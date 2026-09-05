import { z } from "zod";
import {
  isValidMaterialUrl,
  MAX_MATERIAL_TITLE_LENGTH,
  MAX_MATERIAL_URL_LENGTH,
  MAX_MATERIALS,
  MAX_NOTE_LENGTH,
} from "@/features/period-log/domain/entities/period-prep.entity";

export interface PeriodPrepFormValues {
  note: string;
  /** `""` = no plan selected — the `<Select>` has no null value. */
  lessonPlanId: string;
  materials: { title: string; url: string }[];
}

/**
 * Client validation for the prep form. Every bound comes from the ENTITY's
 * constants (which mirror the BE contract), never a re-declared literal, so the
 * form and the domain guard cannot drift apart.
 *
 * Messages are passed in already-translated (`i18n.md`: presentation
 * translates), so this factory takes a resolver instead of importing next-intl.
 */
export function periodPrepSchema(t: {
  noteTooLong: string;
  materialTitleRequired: string;
  materialUrlInvalid: string;
  materialUrlTooLong: string;
}) {
  return z.object({
    note: z.string().max(MAX_NOTE_LENGTH, { message: t.noteTooLong }),
    lessonPlanId: z.string(),
    materials: z
      .array(
        z.object({
          title: z
            .string()
            .trim()
            .min(1, { message: t.materialTitleRequired })
            .max(MAX_MATERIAL_TITLE_LENGTH, {
              message: t.materialTitleRequired,
            }),
          url: z
            .string()
            .trim()
            // The BE's own `maxLength` — a 2001-char link is rejected server
            // side, so it is refused here rather than after a round trip.
            .max(MAX_MATERIAL_URL_LENGTH, { message: t.materialUrlTooLong })
            .refine(isValidMaterialUrl, { message: t.materialUrlInvalid }),
        }),
      )
      // The 21st link is blocked by the disabled "+ Thêm" button, by this cap,
      // by the use-case guard AND by the BE — four layers, one constant.
      .max(MAX_MATERIALS),
  });
}
