export function isAuthRateLimitError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return error.message.toLowerCase().includes("rate limit");
}

export function formatAuthRateLimitMessage(context: "signup" | "password_reset") {
  if (context === "password_reset") {
    return "E-Mail-Versand ist vorübergehend blockiert (Supabase-Limit: ca. 2 E-Mails pro Stunde für das gesamte Projekt). Bitte warten Sie 30–60 Minuten und versuchen Sie es erneut.";
  }

  return "E-Mail-Versand ist vorübergehend blockiert (Supabase-Limit: ca. 2 E-Mails pro Stunde für das gesamte Projekt). Eine andere E-Mail-Adresse hilft nicht — nutzen Sie stattdessen „Registrierung fortsetzen“ mit Ihrem bestehenden Konto, oder warten Sie 30–60 Minuten.";
}

export function formatAuthError(
  error: unknown,
  context: "signup" | "password_reset",
  fallback: string,
) {
  if (!(error instanceof Error) || !error.message.trim()) {
    return fallback;
  }

  if (isAuthRateLimitError(error)) {
    return formatAuthRateLimitMessage(context);
  }

  return error.message;
}
