import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getPreviewSecret,
  isAppLaunched,
  isPublicProductionHost,
  PREVIEW_COOKIE,
} from "@/lib/site-gate";

const ALLOWED_WHEN_GATED = ["/coming-soon", "/impressum", "/datenschutz", "/notfall"];

function isAllowedWhenGated(pathname: string): boolean {
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;

  return ALLOWED_WHEN_GATED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname, searchParams } = request.nextUrl;

  const previewSecret = getPreviewSecret();
  const previewParam = searchParams.get("preview");
  if (previewSecret && previewParam === previewSecret) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("preview");
    const response = NextResponse.redirect(url);
    response.cookies.set(PREVIEW_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  }

  const hasPreviewCookie = request.cookies.get(PREVIEW_COOKIE)?.value === "1";
  const shouldGate =
    !isAppLaunched() && isPublicProductionHost(host) && !hasPreviewCookie;

  if (!shouldGate || isAllowedWhenGated(pathname)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/coming-soon";
  url.search = "";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
