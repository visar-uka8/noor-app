export const PUBLIC_PRODUCTION_HOSTS = [
  "noorhealth.app",
  "www.noorhealth.app",
  "noorhealth.de",
  "www.noorhealth.de",
] as const;

export const MARKETING_HOSTS = [
  "noorhealth.de",
  "www.noorhealth.de",
] as const;

export const APP_BASE_URL = "https://www.noorhealth.app";

export const APP_REGISTER_URL = `${APP_BASE_URL}/register`;
export const APP_LOGIN_URL = `${APP_BASE_URL}/login`;

export function getMarketingAuthUrls(host: string) {
  if (isMarketingHost(host)) {
    return {
      registerUrl: APP_REGISTER_URL,
      loginUrl: APP_LOGIN_URL,
    };
  }

  return {
    registerUrl: "/register",
    loginUrl: "/login",
  };
}

/** URL Supabase uses for email confirmation and password reset links. */
export function getAuthCallbackUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  if (configured && !configured.includes("localhost")) {
    return `${configured}/auth/callback`;
  }

  return `${APP_BASE_URL}/auth/callback`;
}

export const PREVIEW_COOKIE = "noor_preview";

export function isPublicProductionHost(host: string): boolean {
  const hostname = host.split(":")[0].toLowerCase();
  return (PUBLIC_PRODUCTION_HOSTS as readonly string[]).includes(hostname);
}

export function isMarketingHost(host: string): boolean {
  const hostname = host.split(":")[0].toLowerCase();
  return (MARKETING_HOSTS as readonly string[]).includes(hostname);
}

export function isMarketingPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/landing" ||
    pathname === "/preise" ||
    pathname === "/impressum" ||
    pathname === "/datenschutz" ||
    pathname === "/coming-soon"
  );
}

export function isAppLaunched(): boolean {
  return process.env.NEXT_PUBLIC_APP_LAUNCHED === "true";
}

export function getPreviewSecret(): string | undefined {
  return process.env.SITE_PREVIEW_SECRET;
}

function isLocalDevHost(host: string): boolean {
  const hostname = host.split(":")[0].toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** Where signed-in users go after visiting the marketing landing page. null = stay on landing (local preview). */
export function getLandingSignedInRedirectUrl(): string | null {
  if (typeof window === "undefined") {
    return APP_BASE_URL;
  }

  if (
    isLocalDevHost(window.location.host) &&
    window.location.pathname === "/landing"
  ) {
    return null;
  }

  if (isMarketingHost(window.location.host) && !isLocalDevHost(window.location.host)) {
    return APP_BASE_URL;
  }

  return "/";
}
