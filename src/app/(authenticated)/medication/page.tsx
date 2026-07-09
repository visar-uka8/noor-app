import { AppHeader } from "@/components/AppHeader";
import { MedicationConfirmation } from "@/components/MedicationConfirmation";

export default function MedicationPage() {
  return (
    <div className="flex flex-col">
      <AppHeader showBack title="Medikamente" />
      <MedicationConfirmation />
    </div>
  );
}
