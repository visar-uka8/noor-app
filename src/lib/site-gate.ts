export const PUBLIC_PRODUCTION_HOSTS = [
  "noorhealth.app",
  "www.noorhealth.app",
  "noorhealth.de",
  "www.noorhealth.de",
] as const;

export const PREVIEW_COOKIE = "noor_preview";

export function isPublicProductionHost(host: string): boolean {
  const hostname = host.split(":")[0].toLowerCase();
  return (PUBLIC_PRODUCTION_HOSTS as readonly string[]).includes(hostname);
}

export function isAppLaunched(): boolean {
  return process.env.NEXT_PUBLIC_APP_LAUNCHED === "true";
}

export function getPreviewSecret(): string | undefined {
  return process.env.SITE_PREVIEW_SECRET;
}
