import "server-only";

/**
 * Mock infra cho phase development. DI factory chọn repo:
 *   const repo = USE_MOCK
 *     ? new MockXxxRepository()
 *     : new XxxRepository(await createServerHttpClient())
 */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function mockDelay(ms = 300) {
  if (process.env.NODE_ENV !== "production") {
    await new Promise((r) => setTimeout(r, ms));
  }
}
