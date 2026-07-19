export const commonVaccines = [
  "COVID-19 (Corona)",
  "Influenza (Grippe)",
  "Tetanus",
  "Diphtherie",
  "Pertussis (Keuchhusten)",
  "Masern",
  "Mumps",
  "Röteln",
  "Hepatitis A",
  "Hepatitis B",
  "Pneumokokken",
  "FSME (Zecken)",
  "Herpes Zoster (Gürtelrose)",
  "HPV",
  "Polio (Kinderlähmung)",
] as const;

export function filterCommonVaccines(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return commonVaccines.filter((vaccine) =>
    vaccine.toLowerCase().includes(normalized),
  );
}
