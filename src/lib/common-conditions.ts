export const commonConditions = [
  "Neurodermitis",
  "Diabetes Typ 1",
  "Diabetes Typ 2",
  "Bluthochdruck",
  "Herzinsuffizienz",
  "Koronare Herzkrankheit",
  "Asthma",
  "COPD",
  "Schilddrüsenunterfunktion",
  "Schilddrüsenüberfunktion",
  "Rheuma",
  "Arthrose",
  "Osteoporose",
  "Depression",
  "Angststörung",
  "Nierenschwäche",
  "Lebererkrankung",
  "Epilepsie",
  "Multiple Sklerose",
  "Parkinson",
  "Demenz",
  "Schlaganfall",
  "Krebserkrankung",
  "Psoriasis",
  "Reizdarm",
  "Morbus Crohn",
  "Colitis ulcerosa",
  "Migräne",
  "Schlafapnoe",
] as const;

export function filterCommonConditions(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return commonConditions.filter((condition) =>
    condition.toLowerCase().includes(normalized),
  );
}
