import { getAuthCallbackUrl } from "@/lib/site-gate";

export const REGISTRATION_ONBOARDING_PATH = "/register?onboarding=1";

export function needsRegistrationOnboarding(
  profile: { role?: string | null } | null | undefined,
) {
  return !profile?.role;
}

export function safeAuthRedirectPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return REGISTRATION_ONBOARDING_PATH;
  }

  return next;
}

export function getRegistrationConfirmUrl() {
  const next = encodeURIComponent(REGISTRATION_ONBOARDING_PATH);
  return `${getAuthCallbackUrl()}?next=${next}`;
}

export function getPasswordResetUrl() {
  const next = encodeURIComponent("/reset-password");
  return `${getAuthCallbackUrl()}?next=${next}`;
}
