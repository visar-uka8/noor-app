export type FontSizePreference = "normal" | "large";

export const fontSizeStorageKey = "noor-font-size";
const legacyElderModeKey = "noor-elder-mode";

export function readFontSizePreference(): FontSizePreference {
  if (typeof window === "undefined") {
    return "normal";
  }

  const saved = window.localStorage.getItem(fontSizeStorageKey);
  if (saved === "large" || saved === "normal") {
    return saved;
  }

  if (window.localStorage.getItem(legacyElderModeKey) === "true") {
    return "large";
  }

  return "normal";
}

export function applyFontSizePreference(size: FontSizePreference) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("elder-mode", size === "large");

  if (typeof window !== "undefined") {
    window.localStorage.setItem(fontSizeStorageKey, size);
  }
}

export const fontSizeBootScript = `
(function () {
  try {
    var size = localStorage.getItem('${fontSizeStorageKey}');
    if (size === 'large' || localStorage.getItem('${legacyElderModeKey}') === 'true') {
      document.documentElement.classList.add('elder-mode');
    }
  } catch (e) {}
})();
`;
