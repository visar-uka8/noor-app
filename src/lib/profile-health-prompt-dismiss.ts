const legacyStorageKey = "noor-dismissed-profile-health-prompt";

function storageKey(userId: string) {
  return `noor-dismissed-profile-health-prompt-${userId}`;
}

export function isProfileHealthPromptDismissed(userId?: string | null) {
  if (typeof window === "undefined" || !userId) return false;

  try {
    return window.localStorage.getItem(storageKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function dismissProfileHealthPrompt(userId?: string | null) {
  if (typeof window === "undefined" || !userId) return;

  try {
    window.localStorage.setItem(storageKey(userId), "1");
  } catch {
    // Ignore storage failures.
  }
}

export function clearProfileHealthPromptDismissal(userId?: string | null) {
  if (typeof window === "undefined") return;

  try {
    if (userId) {
      window.localStorage.removeItem(storageKey(userId));
    }

    window.localStorage.removeItem(legacyStorageKey);
  } catch {
    // Ignore storage failures.
  }
}
