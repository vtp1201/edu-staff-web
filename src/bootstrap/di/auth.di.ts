import "server-only";

import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { LoginUseCase } from "@/features/auth/domain/use-cases/login.use-case";
import { AuthRepository } from "@/features/auth/infrastructure/repositories/auth.repository";

export async function makeLoginUseCase() {
  const http = await createServerHttpClient();
  return new LoginUseCase(new AuthRepository(http));
}
