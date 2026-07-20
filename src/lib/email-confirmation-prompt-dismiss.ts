const storageKey = "noor-dismissed-email-confirmation-prompt";

export function isEmailConfirmationPromptDismissed() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

export function dismissEmailConfirmationPrompt() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // Ignore storage failures.
  }
}
