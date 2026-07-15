import type { ReactionType } from "../../domain/entities/reaction.entity";

/** Updated reaction state wire shape (INT-190-04). */
export interface ReactionResponseDto {
  counts?: Partial<Record<ReactionType, number>>;
  myReaction?: ReactionType | null;
}
