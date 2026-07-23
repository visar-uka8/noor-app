import type { AppLanguage } from "@/lib/i18n/languages";

type TemplateVars = Record<string, string | number>;

function fillTemplate(template: string, vars: TemplateVars) {
  return Object.entries(vars).reduce(
    (result, [name, value]) =>
      result.replaceAll(`{{${name}}}`, String(value)),
    template,
  );
}

export type MedicationMissedEmailTemplate = {
  subject: string;
  greeting: string;
  bodyLine: string;
  doseLine: string;
  footer: string;
  ctaLabel?: string;
};

export type MedicationConfirmedEmailTemplate = {
  subject: string;
  greeting: string;
  intro: string;
  doseLine: string;
  footer: string;
};

export type LabResultEmailTemplate = {
  subject: string;
  greeting: string;
  intro: string;
  summaryLabel: string;
  summaryLine: string;
  ctaLabel: string;
};

export type FamilyConnectionEmailTemplate = {
  subject: string;
  greeting: string;
  body: string;
  warning: string;
  ctaLabel: string;
};

export type AppointmentReminderEmailTemplate = {
  subject: string;
  greeting: string;
  intro: string;
  ctaLabel: string;
};

const medicationMissedFamilyTemplates: Record<
  AppLanguage,
  MedicationMissedEmailTemplate
> = {
  de: {
    subject: "⚠️ {{name}} hat eine Dosis noch nicht bestätigt",
    greeting: "Hallo {{recipientName}},",
    bodyLine: "{{name}} hat die {{slot}}-Dosis noch nicht bestätigt:",
    doseLine: "💊 {{medication}} — fällig um {{time}} Uhr",
    footer: "Es könnte sich lohnen kurz anzurufen.",
  },
  en: {
    subject: "⚠️ {{name}} missed a dose",
    greeting: "Hello {{recipientName}},",
    bodyLine: "{{name}} has not confirmed the {{slot}} dose yet:",
    doseLine: "💊 {{medication}} — due at {{time}}",
    footer: "It may be worth giving them a quick call.",
  },
  tr: {
    subject: "⚠️ {{name}} bir dozu unuttu",
    greeting: "Merhaba {{recipientName}},",
    bodyLine: "{{name}} {{slot}} dozunu henüz onaylamadı:",
    doseLine: "💊 {{medication}} — saat {{time}}",
    footer: "Kısa bir arama yapmak faydalı olabilir.",
  },
  sq: {
    subject: "⚠️ {{name}} harroi një dozë",
    greeting: "Përshëndetje {{recipientName}},",
    bodyLine: "{{name}} nuk e ka konfirmuar ende dozën e {{slot}}:",
    doseLine: "💊 {{medication}} — duhej në {{time}}",
    footer: "Mund të vlejë të telefononi shpejt.",
  },
};

const medicationMissedPatientTemplates: Record<
  AppLanguage,
  MedicationMissedEmailTemplate
> = {
  de: {
    subject: "💊 Erinnerung: {{slot}}-Dosis noch offen",
    greeting: "Hallo {{recipientName}},",
    bodyLine: "Sie haben Ihre {{slot}}-Dosis noch nicht bestätigt:",
    doseLine: "💊 {{medication}} — fällig um {{time}} Uhr",
    footer:
      "Bitte öffnen Sie Noor und tippen Sie auf die Dosis, sobald Sie sie eingenommen haben.",
    ctaLabel: "Medikamente öffnen",
  },
  en: {
    subject: "💊 Reminder: {{slot}} dose still pending",
    greeting: "Hello {{recipientName}},",
    bodyLine: "You have not confirmed your {{slot}} dose yet:",
    doseLine: "💊 {{medication}} — due at {{time}}",
    footer: "Please open Noor and tap the dose once you have taken it.",
    ctaLabel: "Open medications",
  },
  tr: {
    subject: "💊 Hatırlatma: {{slot}} dozu bekliyor",
    greeting: "Merhaba {{recipientName}},",
    bodyLine: "{{slot}} dozunuzu henüz onaylamadınız:",
    doseLine: "💊 {{medication}} — saat {{time}}",
    footer:
      "Lütfen Noor'u açın ve ilacı aldıktan sonra doza dokunun.",
    ctaLabel: "İlaçları aç",
  },
  sq: {
    subject: "💧 Kujtesë: doza {{slot}} ende në pritje",
    greeting: "Përshëndetje {{recipientName}},",
    bodyLine: "Nuk e keni konfirmuar ende dozën e {{slot}}:",
    doseLine: "💊 {{medication}} — duhej në {{time}}",
    footer:
      "Ju lutem hapni Noor dhe prekni dozën sapo ta keni marrë.",
    ctaLabel: "Hap medikamentet",
  },
};

const medicationConfirmedTemplates: Record<
  AppLanguage,
  MedicationConfirmedEmailTemplate
> = {
  de: {
    subject: "✓ {{name}} hat seine Medikamente genommen",
    greeting: "Hallo {{recipientName}},",
    intro:
      "Gute Nachricht — {{name}} hat gerade seine {{slot}}-Dosis bestätigt:",
    doseLine: "💊 {{medication}} — {{time}} Uhr ✓",
    footer: "Alles gut heute.",
  },
  en: {
    subject: "✓ {{name}} took their medication",
    greeting: "Hello {{recipientName}},",
    intro: "Good news — {{name}} just confirmed their {{slot}} dose:",
    doseLine: "💊 {{medication}} — {{time}} ✓",
    footer: "All good today.",
  },
  tr: {
    subject: "✓ {{name}} ilacını aldı",
    greeting: "Merhaba {{recipientName}},",
    intro: "İyi haber — {{name}} az önce {{slot}} dozunu onayladı:",
    doseLine: "💊 {{medication}} — {{time}} ✓",
    footer: "Bugün her şey yolunda.",
  },
  sq: {
    subject: "✓ {{name}} mori medikamentin",
    greeting: "Përshëndetje {{recipientName}},",
    intro: "Lajm i mirë — {{name}} sapo konfirmoi dozën e {{slot}}:",
    doseLine: "💊 {{medication}} — {{time}} ✓",
    footer: "Sot gjithçka mirë.",
  },
};

const labResultTemplates: Record<AppLanguage, LabResultEmailTemplate> = {
  de: {
    subject: "Neue Laborwerte von {{name}}",
    greeting: "Hallo {{recipientName}},",
    intro: "{{name}} hat heute neue Laborwerte hochgeladen.",
    summaryLabel: "Zusammenfassung:",
    summaryLine: "🟢 {{normal}} Normal  🟡 {{watch}} Beachten  🔴 {{high}} Erhöht",
    ctaLabel: "Vollständige Analyse ansehen →",
  },
  en: {
    subject: "New lab results from {{name}}",
    greeting: "Hello {{recipientName}},",
    intro: "{{name}} uploaded new lab results today.",
    summaryLabel: "Summary:",
    summaryLine: "🟢 {{normal}} Normal  🟡 {{watch}} Watch  🔴 {{high}} High",
    ctaLabel: "View full analysis →",
  },
  tr: {
    subject: "{{name}} yeni laboratuvar sonuçları yükledi",
    greeting: "Merhaba {{recipientName}},",
    intro: "{{name}} bugün yeni laboratuvar sonuçları yükledi.",
    summaryLabel: "Özet:",
    summaryLine:
      "🟢 {{normal}} Normal  🟡 {{watch}} Dikkat  🔴 {{high}} Yüksek",
    ctaLabel: "Tam analizi gör →",
  },
  sq: {
    subject: "Rezultate të reja laboratori nga {{name}}",
    greeting: "Përshëndetje {{recipientName}},",
    intro: "{{name}} ngarkoi sot rezultate të reja laboratori.",
    summaryLabel: "Përmbledhje:",
    summaryLine:
      "🟢 {{normal}} Normal  🟡 {{watch}} Vëmendje  🔴 {{high}} I lartë",
    ctaLabel: "Shiko analizën e plotë →",
  },
};

const familyConnectionTemplates: Record<
  AppLanguage,
  FamilyConnectionEmailTemplate
> = {
  de: {
    subject: "Neue Familienverbindung bei Noor",
    greeting: "Hallo {{recipientName}},",
    body: "{{familyMemberName}} hat sich gerade mit Ihrem Noor-Konto verbunden. Er kann jetzt Ihre Medikamentenbestätigungen und Laborwerte sehen.",
    warning:
      "Wenn Sie diese Verbindung nicht autorisiert haben, können Sie sie in der App unter Profil → Familienverbindungen trennen.",
    ctaLabel: "Familienverbindungen öffnen",
  },
  en: {
    subject: "New family connection on Noor",
    greeting: "Hello {{recipientName}},",
    body: "{{familyMemberName}} just connected to your Noor account. They can now see your medication confirmations and lab results.",
    warning:
      "If you did not authorize this connection, you can disconnect it in the app under Profile → Family connections.",
    ctaLabel: "Open family connections",
  },
  tr: {
    subject: "Noor'da yeni aile bağlantısı",
    greeting: "Merhaba {{recipientName}},",
    body: "{{familyMemberName}} az önce Noor hesabınıza bağlandı. Artık ilaç onaylarınızı ve laboratuvar sonuçlarınızı görebilir.",
    warning:
      "Bu bağlantıyı siz yetkilendirmediyseniz, uygulamada Profil → Aile bağlantıları bölümünden kaldırabilirsiniz.",
    ctaLabel: "Aile bağlantılarını aç",
  },
  sq: {
    subject: "Lidhje e re familjare në Noor",
    greeting: "Përshëndetje {{recipientName}},",
    body: "{{familyMemberName}} sapo u lidh me llogarinë tuaj Noor. Tani mund të shohë konfirmimet e medikamenteve dhe rezultatet e laboratorit.",
    warning:
      "Nëse nuk e keni autorizuar këtë lidhje, mund ta shkëputni në aplikacion te Profili → Lidhjet familjare.",
    ctaLabel: "Hap lidhjet familjare",
  },
};

const appointmentReminderTemplates: Record<
  AppLanguage,
  AppointmentReminderEmailTemplate
> = {
  de: {
    subject: "Erinnerung: Termin morgen bei {{doctorName}}",
    greeting: "Hallo {{recipientName}},",
    intro:
      "Morgen haben Sie einen Termin bei {{doctorName}} ({{appointmentWhen}}).",
    ctaLabel: "Termin in Noor öffnen",
  },
  en: {
    subject: "Reminder: appointment tomorrow with {{doctorName}}",
    greeting: "Hello {{recipientName}},",
    intro:
      "Tomorrow you have an appointment with {{doctorName}} ({{appointmentWhen}}).",
    ctaLabel: "Open appointment in Noor",
  },
  tr: {
    subject: "Hatırlatma: yarın {{doctorName}} randevunuz var",
    greeting: "Merhaba {{recipientName}},",
    intro:
      "Yarın {{doctorName}} ile randevunuz var ({{appointmentWhen}}).",
    ctaLabel: "Randevuyu Noor'da aç",
  },
  sq: {
    subject: "Kujtesë: takim nesër te {{doctorName}}",
    greeting: "Përshëndetje {{recipientName}},",
    intro:
      "Nesër keni takim te {{doctorName}} ({{appointmentWhen}}).",
    ctaLabel: "Hap takimin në Noor",
  },
};

export function getMedicationMissedFamilyEmail(
  language: AppLanguage,
  vars: TemplateVars,
) {
  const template = medicationMissedFamilyTemplates[language];
  return {
    subject: fillTemplate(template.subject, vars),
    greeting: fillTemplate(template.greeting, vars),
    bodyLine: fillTemplate(template.bodyLine, vars),
    doseLine: fillTemplate(template.doseLine, vars),
    footer: fillTemplate(template.footer, vars),
  };
}

export function getMedicationMissedPatientEmail(
  language: AppLanguage,
  vars: TemplateVars,
) {
  const template = medicationMissedPatientTemplates[language];
  return {
    subject: fillTemplate(template.subject, vars),
    greeting: fillTemplate(template.greeting, vars),
    bodyLine: fillTemplate(template.bodyLine, vars),
    doseLine: fillTemplate(template.doseLine, vars),
    footer: fillTemplate(template.footer, vars),
    ctaLabel: template.ctaLabel
      ? fillTemplate(template.ctaLabel, vars)
      : undefined,
  };
}

export function getMedicationConfirmedEmail(
  language: AppLanguage,
  vars: TemplateVars,
) {
  const template = medicationConfirmedTemplates[language];
  return {
    subject: fillTemplate(template.subject, vars),
    greeting: fillTemplate(template.greeting, vars),
    intro: fillTemplate(template.intro, vars),
    doseLine: fillTemplate(template.doseLine, vars),
    footer: fillTemplate(template.footer, vars),
  };
}

export function getLabResultEmail(language: AppLanguage, vars: TemplateVars) {
  const template = labResultTemplates[language];
  return {
    subject: fillTemplate(template.subject, vars),
    greeting: fillTemplate(template.greeting, vars),
    intro: fillTemplate(template.intro, vars),
    summaryLabel: fillTemplate(template.summaryLabel, vars),
    summaryLine: fillTemplate(template.summaryLine, vars),
    ctaLabel: fillTemplate(template.ctaLabel, vars),
  };
}

export function getFamilyConnectionEmail(
  language: AppLanguage,
  vars: TemplateVars,
) {
  const template = familyConnectionTemplates[language];
  return {
    subject: fillTemplate(template.subject, vars),
    greeting: fillTemplate(template.greeting, vars),
    body: fillTemplate(template.body, vars),
    warning: fillTemplate(template.warning, vars),
    ctaLabel: fillTemplate(template.ctaLabel, vars),
  };
}

export function getAppointmentReminderEmail(
  language: AppLanguage,
  vars: TemplateVars,
) {
  const template = appointmentReminderTemplates[language];
  return {
    subject: fillTemplate(template.subject, vars),
    greeting: fillTemplate(template.greeting, vars),
    intro: fillTemplate(template.intro, vars),
    ctaLabel: fillTemplate(template.ctaLabel, vars),
  };
}
