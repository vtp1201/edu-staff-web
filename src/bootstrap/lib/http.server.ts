import "server-only";
import { cookies } from "next/headers";
import { createHttpClient } from "./http";

export async function createServerHttpClient() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  return createHttpClient(token);
}
