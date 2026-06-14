import type {
  IClassLogRepository,
  ListEntriesParams,
  ListEntriesResult,
} from "../repositories/i-class-log.repository";

export class ListEntriesUseCase {
  constructor(private readonly repo: IClassLogRepository) {}

  async execute(params: ListEntriesParams): Promise<ListEntriesResult> {
    return this.repo.listEntries(params);
  }
}
