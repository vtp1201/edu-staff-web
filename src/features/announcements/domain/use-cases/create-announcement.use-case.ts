import type {
  AnnouncementEntity,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "../entities/announcement.entity";
import type { AnnouncementFailure } from "../failures/announcement.failure";
import type { IAnnouncementRepository } from "../repositories/i-announcement.repository";

const MIN_TITLE = 5;
const MIN_BODY = 10;

/** Clock injection keeps schedule validation deterministic in tests. */
export type Clock = () => number;

function fail(type: AnnouncementFailure["type"]): never {
  const failure: AnnouncementFailure = { type };
  throw failure;
}

/**
 * Validates a create/edit announcement payload then delegates to the repo.
 * Throwing convention — rejects with {@link AnnouncementFailure} on invalid input.
 */
export class CreateAnnouncementUseCase {
  constructor(
    private readonly repo: IAnnouncementRepository,
    private readonly now: Clock = () => Date.now(),
  ) {}

  private validate(input: CreateAnnouncementInput): void {
    if (input.title.trim().length < MIN_TITLE) fail("title-too-short");
    if (input.body.trim().length < MIN_BODY) fail("body-too-short");
    if (input.audience.length === 0) fail("no-audience");
    if (input.sendMode === "scheduled") {
      if (!input.scheduledAt) fail("schedule-past-date");
      const at = new Date(input.scheduledAt).getTime();
      if (Number.isNaN(at) || at <= this.now()) fail("schedule-past-date");
    }
  }

  async execute(input: CreateAnnouncementInput): Promise<AnnouncementEntity> {
    this.validate(input);
    return this.repo.createAnnouncement(input);
  }

  /** Save/update a draft — strict field validation is skipped for drafts. */
  async saveDraft(input: UpdateAnnouncementInput): Promise<AnnouncementEntity> {
    return this.repo.updateAnnouncement(input);
  }
}
