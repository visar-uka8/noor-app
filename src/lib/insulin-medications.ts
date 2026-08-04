import type { InsulinType } from "@/types/medication";
import { defaultMealInsulinTimeValues } from "@/types/medication";

export const INSULIN_MEDICATION_NAMES = [
  "Insulin",
  "Novorapid",
  "Humalog",
  "Apidra",
  "Lantus",
  "Toujeo",
  "Tresiba",
  "Levemir",
  "Mixtard",
  "NovoMix",
  "Humulin",
  "Actrapid",
  "Insuman",
] as const;

export function isInsulinMedicationName(name: string) {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return false;

  return INSULIN_MEDICATION_NAMES.some((type) =>
    normalized.includes(type.toLowerCase()),
  );
}

export function inferInsulinTypeFromName(name: string): InsulinType | null {
  const normalized = name.trim().toLowerCase();
  const basalNames = [
    "lantus",
    "toujeo",
    "tresiba",
    "levemir",
  ];
  const mealNames = [
    "novorapid",
    "humalog",
    "apidra",
    "actrapid",
    "insuman",
  ];

  if (basalNames.some((entry) => normalized.includes(entry))) {
    return "basal";
  }

  if (mealNames.some((entry) => normalized.includes(entry))) {
    return "mahlzeit";
  }

  return null;
}

export function formatBasalDosage(units: number) {
  return `${units} IE`;
}

export function parseBasalDosageUnits(dosage: string) {
  const match = dosage.trim().match(/^(\d+)\s*IE$/i);
  return match ? Number(match[1]) : null;
}

export function getDefaultMealInsulinTimes() {
  return { ...defaultMealInsulinTimeValues };
}

export function getInsulinTypeLabel(type: InsulinType) {
  return type === "basal" ? "Basalinsulin" : "Mahlzeiteninsulin";
}
