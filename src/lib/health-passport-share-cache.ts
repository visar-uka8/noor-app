import type { HealthPassportShare } from "@/lib/health-passport-share";

export const EMERGENCY_SHARE_CACHE_KEY = "noor-emergency-share";

export type CachedEmergencyShare = {
  id: string;
  token: string;
  expiresAt: string;
  shareUrl: string;
  qrDataUrl: string;
};

const ONE_HOUR_MS = 60 * 60 * 1000;

export function readEmergencyShareCache(): CachedEmergencyShare | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(EMERGENCY_SHARE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CachedEmergencyShare>;
    if (
      !parsed?.token ||
      !parsed.expiresAt ||
      !parsed.shareUrl ||
      !parsed.qrDataUrl
    ) {
      return null;
    }

    return {
      id: parsed.id ?? "",
      token: parsed.token,
      expiresAt: parsed.expiresAt,
      shareUrl: parsed.shareUrl,
      qrDataUrl: parsed.qrDataUrl,
    };
  } catch (error) {
    console.error("Failed to read emergency share cache:", error);
    return null;
  }
}

export function cacheEmergencyShare(
  share: HealthPassportShare,
  qrDataUrl: string,
) {
  if (typeof window === "undefined") return;

  try {
    const payload: CachedEmergencyShare = {
      id: share.id,
      token: share.token,
      expiresAt: share.expiresAt,
      shareUrl: share.shareUrl,
      qrDataUrl,
    };
    window.localStorage.setItem(
      EMERGENCY_SHARE_CACHE_KEY,
      JSON.stringify(payload),
    );
  } catch (error) {
    console.error("Failed to cache emergency share:", error);
  }
}

export function isEmergencyShareValid(expiresAt: string) {
  const expiry = new Date(expiresAt).getTime();
  return !Number.isNaN(expiry) && expiry > Date.now();
}

export function shouldRefreshEmergencyShare(expiresAt: string) {
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return true;
  return Date.now() >= expiry - ONE_HOUR_MS;
}

export function cachedShareToHealthPassportShare(
  cached: CachedEmergencyShare,
): HealthPassportShare {
  return {
    id: cached.id,
    token: cached.token,
    expiresAt: cached.expiresAt,
    shareUrl: cached.shareUrl,
  };
}
