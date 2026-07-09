import { AppHeader } from "@/components/AppHeader";
import { MedicationForm } from "@/components/MedicationForm";

export default function AddMedicationPage() {
  return (
    <div className="flex flex-col">
      <AppHeader showBack backHref="/medication" title="Medikament hinzufügen" />
      <MedicationForm />
    </div>
  );
}
