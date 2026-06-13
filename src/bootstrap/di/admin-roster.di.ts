import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IRosterRepository } from "@/features/admin-roster/domain/repositories/i-roster.repository";
import { MockRosterRepository } from "@/features/admin-roster/infrastructure/repositories/mock-roster.repository";
import { RosterRepository } from "@/features/admin-roster/infrastructure/repositories/roster.repository";

export async function makeRosterRepository(): Promise<IRosterRepository> {
  if (USE_MOCK) {
    return new MockRosterRepository();
  }
  const http = await createServerHttpClient();
  return new RosterRepository(http);
}
