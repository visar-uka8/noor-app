export const commonMedications = [
  "Ramipril",
  "Bisoprolol",
  "Amlodipin",
  "Lisinopril",
  "Metoprolol",
  "Verapamil",
  "Candesartan",
  "Losartan",
  "Simvastatin",
  "Atorvastatin",
  "Rosuvastatin",
  "Metformin",
  "Insulin",
  "Glibenclamid",
  "Aspirin",
  "Marcumar",
  "Xarelto",
  "Eliquis",
  "Pantoprazol",
  "Omeprazol",
  "Ranitidin",
  "Levothyroxin",
  "L-Thyroxin",
  "Ibuprofen",
  "Paracetamol",
  "Diclofenac",
  "Vitamin D3",
  "Vitamin C",
  "Vitamin B12",
  "Omega-3",
  "Magnesium",
  "Calcium",
  "Zink",
  "Folsäure",
  "Eisen",
  "Furosemid",
  "Torasemid",
  "Prednisolon",
  "Allopurinol",
  "Tamsulosin",
  "Finasterid",
] as const;

export const commonDoses: Record<string, string[]> = {
  "Vitamin D3": ["1000 IE", "2000 IE", "4000 IE"],
  "Vitamin C": ["500mg", "1000mg"],
  "Omega-3": ["500mg", "1000mg"],
  Magnesium: ["300mg", "400mg", "500mg"],
  Aspirin: ["100mg", "300mg", "500mg"],
  Ibuprofen: ["200mg", "400mg", "600mg"],
  Paracetamol: ["500mg", "1000mg"],
  Ramipril: ["2.5mg", "5mg", "10mg"],
  Metformin: ["500mg", "850mg", "1000mg"],
  Pantoprazol: ["20mg", "40mg"],
  Levothyroxin: ["25µg", "50µg", "75µg", "100µg"],
  Amlodipin: ["5mg", "10mg"],
  Bisoprolol: ["2.5mg", "5mg", "10mg"],
};

export function filterCommonMedications(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return commonMedications.filter((medication) =>
    medication.toLowerCase().includes(normalized),
  );
}

export function getSuggestedDoses(medicationName: string) {
  return commonDoses[medicationName.trim()] ?? [];
}

export function isKnownMedication(medicationName: string) {
  return commonMedications.includes(
    medicationName.trim() as (typeof commonMedications)[number],
  );
}
