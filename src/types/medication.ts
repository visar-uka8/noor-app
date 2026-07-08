export type MedicationTime = "morning" | "midday" | "evening";

export type MedicationDose = {
  time: MedicationTime;
  label: string;
  name: string;
  dose: string;
};

export const medicationDoses: MedicationDose[] = [
  {
    time: "morning",
    label: "Morgens",
    name: "Omega-3",
    dose: "1000mg",
  },
  {
    time: "midday",
    label: "Mittags",
    name: "Blutdrucktablette",
    dose: "",
  },
  {
    time: "evening",
    label: "Abends",
    name: "Vitamin D",
    dose: "",
  },
];
