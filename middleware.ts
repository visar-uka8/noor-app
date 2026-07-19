import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  APP_BASE_URL,
  getPreviewSecret,
  isAppLaunched,
  isMarketingHost,
  isMarketingPath,
  isPublicProductionHost,
  PREVIEW_COOKIE,
} from "@/lib/site-gate";

const ALLOWED_WHEN_GATED = [
  "/coming-soon",
  "/impressum",
  "/datenschutz",
  "/notfall",
  "/landing",
  "/login",
  "/register",
  "/auth/callback",
];

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/shared",
  "/notfall",
  "/coming-soon",
  "/impressum",
  "/datenschutz",
  "/landing",
  "/auth/callback",
];

function isAllowedWhenGated(pathname: string) {
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;

  return ALLOWED_WHEN_GATED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPublicPath(pathname: string) {
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;

  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname, searchParams } = request.nextUrl;

  if (isMarketingHost(host)) {
    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/landing";
      return NextResponse.rewrite(url);
    }

    if (
      !isMarketingPath(pathname) &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/_next") &&
      pathname !== "/favicon.ico"
    ) {
      const destination = new URL(pathname, APP_BASE_URL);
      destination.search = request.nextUrl.search;
      return NextResponse.redirect(destination);
    }
  }

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

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = isPublicPath(pathname) || (isMarketingHost(host) && pathname === "/");

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const hasPreviewCookie = request.cookies.get(PREVIEW_COOKIE)?.value === "1";
  const shouldGate =
    !isAppLaunched() &&
    isPublicProductionHost(host) &&
    !hasPreviewCookie &&
    !isMarketingHost(host);

  if (shouldGate && !user && !isAllowedWhenGated(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/register";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)",
  ],
};
