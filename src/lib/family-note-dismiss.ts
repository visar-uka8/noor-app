const storageKey = "noor-dismissed-family-notes";

function readDismissedNoteIds() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return new Set<string>();

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();

    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set<string>();
  }
}

export function isFamilyNoteDismissed(noteId: string) {
  return readDismissedNoteIds().has(noteId);
}

export function dismissFamilyNote(noteId: string) {
  if (typeof window === "undefined") return;

  const dismissed = readDismissedNoteIds();
  dismissed.add(noteId);

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify([...dismissed]));
  } catch {
    // Ignore storage failures.
  }
}
