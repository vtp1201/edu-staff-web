import type { Term } from "../entities/term.entity";
import type { ICalendarRepository } from "../repositories/i-calendar.repository";
import { fail, ok, type Result } from "./result";

interface UpdateTermInput {
  yearId: string;
  termId: string;
  name: string;
  startDate: string;
  endDate: string;
  existingTerms: Term[];
}

export class UpdateTermUseCase {
  constructor(private readonly repo: ICalendarRepository) {}

  async execute(input: UpdateTermInput): Promise<Result<Term>> {
    const { yearId, termId, name, startDate, endDate, existingTerms } = input;

    if (startDate >= endDate) {
      return fail({
        type: "date-order",
        message: "startDate must be before endDate",
      });
    }

    // Date ranges [a.start, a.end] and [b.start, b.end] overlap when
    // a.start < b.end && a.end > b.start. ISO YYYY-MM-DD compares
    // lexicographically === chronologically. Exclude the term being
    // updated (match by termId) so it never overlaps itself.
    const overlaps = existingTerms.some(
      (t) => t.id !== termId && startDate < t.endDate && endDate > t.startDate,
    );
    if (overlaps) {
      return fail({
        type: "date-overlap",
        message: "term overlaps an existing term",
      });
    }

    const term = await this.repo.updateTerm(yearId, termId, {
      name,
      startDate,
      endDate,
    });
    return ok(term);
  }
}
