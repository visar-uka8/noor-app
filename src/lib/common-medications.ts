export const commonMedications = [
  "Metformin",
  "Ramipril",
  "Bisoprolol",
  "Simvastatin",
  "Amlodipin",
  "Lisinopril",
  "Pantoprazol",
  "Omeprazol",
  "Levothyroxin",
  "Atorvastatin",
  "Aspirin",
  "Ibuprofen",
  "Paracetamol",
  "Vitamin D3",
  "Omega-3",
  "Magnesium",
  "Calcium",
  "Metoprolol",
  "Furosemid",
  "Prednisolon",
] as const;

export function filterCommonMedications(query: string, limit = 6) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return commonMedications
    .filter((medication) => medication.toLowerCase().includes(normalized))
    .slice(0, limit);
}
