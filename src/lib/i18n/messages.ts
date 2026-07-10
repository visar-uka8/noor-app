export type Language = "de" | "en";

export type MessageKey = keyof typeof messages.de;

export const messages = {
  de: {
    "nav.home": "Start",
    "nav.medication": "Medikamente",
    "nav.lab": "Labor",
    "nav.profile": "Profil",
    "nav.main": "Hauptnavigation",
    "common.back": "Zurück",
    "common.retry": "Erneut versuchen",
    "common.oneMoment": "Einen Moment bitte…",
    "common.slowConnection": "Das dauert etwas länger — bitte warten Sie.",
    "home.greetingMorning": "Guten Morgen",
    "home.greetingMidday": "Guten Tag",
    "home.greetingEvening": "Guten Abend",
    "home.greetingNight": "Gute Nacht",
    "home.welcomeBack": "Schön dass Sie da sind",
    "home.openProfile": "Profil öffnen",
    "home.medications": "Medikamente",
    "home.labResults": "Laborwerte",
    "home.family": "Familie",
    "home.healthPassport": "Mein Pass",
    "home.allConfirmed": "Alle bestätigt ✓",
    "home.confirmedCount": "{confirmed} von {total} bestätigt",
    "home.noLabYet": "Noch kein Befund",
    "home.lastLab": "Befund: {date}",
    "home.noFamily": "Familie einladen →",
    "home.oneFamily": "1 Person verbunden",
    "home.familyCount": "{count} Personen verbunden",
    "home.passportComplete": "Vollständig",
    "home.passportIncomplete": "Ausfüllen →",
    "home.doseMissed": "Dosis vergessen",
    "home.confirmNow": "Jetzt bestätigen",
    "home.dosesPending": "Noch 1 Dosis ausstehend",
    "home.dosesPendingPlural": "Noch {count} Dosen ausstehend",
    "home.confirmPrompt": "Bitte jetzt bestätigen",
    "home.confirm": "Bestätigen",
    "home.allMedsTaken": "Alle Medikamente heute genommen ✓",
    "lab.title": "Laborwerte",
    "lab.uploadTitle": "Foto oder PDF hochladen",
    "lab.uploadHint": "Tippen Sie hier um Ihren Laborbefund hochzuladen",
    "lab.takePhoto": "Foto aufnehmen",
    "lab.chooseFile": "Datei auswählen",
    "lab.analyzeNow": "Jetzt analysieren",
    "lab.analyzing": "Ihre Laborwerte werden analysiert...",
    "lab.analyzingHint": "Das dauert nur einen Moment",
    "lab.slowHint":
      "Bei langsamem Internet kann das 1–2 Minuten dauern. Bitte warten Sie und schließen Sie die Seite nicht.",
    "lab.privacy": "Ihre Daten sind verschlüsselt und werden nicht weitergegeben",
    "lab.previewAlt": "Vorschau des ausgewählten Laborbefunds",
    "lab.uploadLabel": "Foto oder PDF hochladen",
    "lab.historyTitle": "Frühere Laborwerte",
    "lab.historyEmptyTitle": "Noch keine Laborwerte",
    "lab.historyEmptySubtitle":
      "Laden Sie Ihren ersten Befund hoch — wir erklären alles auf einfachem Deutsch.",
    "lab.analyzed": "Analysiert",
    "lab.pdfSelected": "PDF ausgewählt",
    "lab.errorTitle": "Die Analyse konnte nicht abgeschlossen werden.",
    "lab.loginRequired":
      "Bitte melden Sie sich an, um Laborwerte hochzuladen.",
    "lab.heicUnsupported":
      "Dieses Fotoformat wird nicht unterstützt. Bitte wählen Sie JPEG oder PDF.",
    "lab.invalidFile": "Bitte laden Sie ein Foto (JPEG/PNG) oder eine PDF-Datei hoch.",
    "lab.unreadable":
      "Das Bild war leider nicht gut lesbar. Bitte versuchen Sie ein klareres Foto aufzunehmen.",
    "lab.unavailable":
      "Analyse momentan nicht verfügbar. Bitte versuchen Sie es später erneut.",
    "lab.notConfigured":
      "Die KI-Analyse ist noch nicht eingerichtet. Bitte fügen Sie einen kostenlosen Google Gemini API-Schlüssel hinzu.",
    "settings.language": "Sprache",
    "settings.languageSubtitle": "Deutsch",
    "settings.german": "Deutsch",
    "settings.english": "Englisch",
    "settings.personal": "Persönliche Einstellungen",
    "settings.editProfile": "Profil bearbeiten",
    "settings.textSize": "Schriftgröße",
    "settings.textSizeSubtitle": "Textgröße anpassen",
    "settings.normal": "Normal",
    "settings.large": "Groß",
  },
  en: {
    "nav.home": "Home",
    "nav.medication": "Medications",
    "nav.lab": "Lab",
    "nav.profile": "Profile",
    "nav.main": "Main navigation",
    "common.back": "Back",
    "common.retry": "Try again",
    "common.oneMoment": "One moment please…",
    "common.slowConnection": "This is taking a bit longer — please wait.",
    "home.greetingMorning": "Good morning",
    "home.greetingMidday": "Good afternoon",
    "home.greetingEvening": "Good evening",
    "home.greetingNight": "Good night",
    "home.welcomeBack": "Good to see you.",
    "home.openProfile": "Open profile",
    "home.medications": "Medications",
    "home.labResults": "Lab results",
    "home.family": "Family",
    "home.healthPassport": "My Pass",
    "home.allConfirmed": "All confirmed ✓",
    "home.confirmedCount": "{confirmed} of {total} confirmed",
    "home.noLabYet": "No results yet",
    "home.lastLab": "Result: {date}",
    "home.noFamily": "Familie einladen →",
    "home.oneFamily": "1 Person verbunden",
    "home.familyCount": "{count} Personen verbunden",
    "home.passportComplete": "Vollständig",
    "home.passportIncomplete": "Fill in →",
    "home.doseMissed": "Dose missed",
    "home.confirmNow": "Confirm now",
    "home.dosesPending": "1 dose still pending",
    "home.dosesPendingPlural": "{count} doses still pending",
    "home.confirmPrompt": "Please confirm now",
    "home.confirm": "Confirm",
    "home.allMedsTaken": "All medications taken today ✓",
    "lab.title": "Lab results",
    "lab.uploadTitle": "Upload photo or PDF",
    "lab.uploadHint": "Tap here to upload your lab report",
    "lab.takePhoto": "Take photo",
    "lab.chooseFile": "Choose file",
    "lab.analyzeNow": "Analyze now",
    "lab.analyzing": "Analyzing your lab results...",
    "lab.analyzingHint": "This will only take a moment",
    "lab.slowHint":
      "On a slow connection this can take 1–2 minutes. Please wait and do not close the page.",
    "lab.privacy": "Your data is encrypted and never shared",
    "lab.previewAlt": "Preview of selected lab report",
    "lab.uploadLabel": "Upload photo or PDF",
    "lab.historyTitle": "Previous lab results",
    "lab.historyEmptyTitle": "No lab results yet",
    "lab.historyEmptySubtitle":
      "Upload your first report — we explain everything in plain language.",
    "lab.analyzed": "Analyzed",
    "lab.pdfSelected": "PDF selected",
    "lab.errorTitle": "The analysis could not be completed.",
    "lab.loginRequired": "Please sign in to upload lab results.",
    "lab.heicUnsupported":
      "This photo format is not supported. Please choose JPEG or PDF.",
    "lab.invalidFile": "Please upload a photo (JPEG/PNG) or a PDF file.",
    "lab.unreadable":
      "The image was hard to read. Please try a clearer photo.",
    "lab.unavailable":
      "Analysis is temporarily unavailable. Please try again later.",
    "lab.notConfigured":
      "AI analysis is not set up yet. Please add a free Google Gemini API key.",
    "settings.language": "Language",
    "settings.languageSubtitle": "German or English",
    "settings.german": "German",
    "settings.english": "English",
    "settings.personal": "Personal settings",
    "settings.editProfile": "Edit profile",
    "settings.textSize": "Text size",
    "settings.textSizeSubtitle": "Adjust text size",
    "settings.normal": "Normal",
    "settings.large": "Large",
  },
} as const;

export function translate(
  language: Language,
  key: MessageKey,
  vars?: Record<string, string | number>,
) {
  let text: string = messages[language][key] ?? messages.de[key] ?? key;

  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replace(`{${name}}`, String(value));
    }
  }

  return text;
}

export function getTimeGreeting(language: Language, date: Date) {
  const hour = date.getHours();
  let key: MessageKey;

  if (hour >= 5 && hour < 11) key = "home.greetingMorning";
  else if (hour >= 11 && hour < 14) key = "home.greetingMidday";
  else if (hour >= 14 && hour < 21) key = "home.greetingEvening";
  else key = "home.greetingNight";

  return translate(language, key);
}

export function formatLocalizedDate(
  _language: Language,
  dateString: string,
) {
  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
