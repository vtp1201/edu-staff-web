import createMiddleware from "next-intl/middleware";
import { routing } from "./bootstrap/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/", "/(vi|en)/:path*"],
};
